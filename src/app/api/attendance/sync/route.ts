import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { handler, json, ApiError, readBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDB, mutate, now, uid } from "@/lib/db";
import { consumeIMSSession } from "@/lib/ims";

/**
 * POST /api/attendance/sync
 *
 * Launches the local scripts/nsut.py automation to extract attendance from
 * the student's IMS session. Two supported flows:
 *
 *   1. Native login panel: when the body carries an `imsToken` produced by
 *      /api/attendance/ims, the already-authenticated IMS session cookie is
 *      handed to the script through the NSUT_IMS_SESSION environment
 *      variable (never argv, never logged) so no second login is needed.
 *   2. Fallback: the script opens Chrome and the student logs in manually.
 *
 * Architecture note: This works ONLY when CampusConnect runs locally on the
 * student's own Windows machine. The Node.js server spawns a Python child
 * process on the same machine. On a remote/shared server this would fail
 * because the server has no access to the student's browser or desktop.
 *
 * Security:
 *   - Requires a valid CampusConnect session (requireUser).
 *   - studentId is derived from the authenticated user.
 *   - Never stores IMS passwords, CAPTCHA answers, cookies, or tokens.
 *   - Validates all extracted attendance data.
 *   - Prevents duplicate imports via extractedAt-based importKey.
 *   - Does not overwrite faculty/admin-managed records.
 */

/** In-memory lock: prevents concurrent sync runs on the same local machine. */
let syncInProgress = false;

/** Last known sync progress, exposed by GET ?status=1 for the UI. */
let syncProgress: { step: string; message: string } = {
  step: "idle",
  message: "",
};

/** Minimum checks for local environment. */
async function checkPythonAvailable(): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const check = spawn("python", ["--version"], { timeout: 5000, windowsHide: true });
    let stderr = "";
    check.stderr.on("data", (d) => (stderr += d.toString()));
    check.on("error", () => resolve({ ok: false, message: "Python is not installed. Please install Python 3.8+ from python.org and ensure it is on PATH." }));
    check.on("close", (code) => {
      if (code === 0) resolve({ ok: true, message: "OK" });
      else resolve({ ok: false, message: stderr || "Python check failed." });
    });
  });
}

async function checkSeleniumAvailable(): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const check = spawn("python", ["-c", "import selenium; print('ok')"], { timeout: 10000, windowsHide: true });
    let stdout = "";
    let stderr = "";
    check.stdout.on("data", (d) => (stdout += d.toString()));
    check.stderr.on("data", (d) => (stderr += d.toString()));
    check.on("error", () => resolve({ ok: false, message: "Could not run Python." }));
    check.on("close", (code) => {
      if (code === 0 && stdout.includes("ok")) resolve({ ok: true, message: "OK" });
      else resolve({ ok: false, message: stderr.trim() || "Selenium is not installed. Run: pip install selenium" });
    });
  });
}

interface SyncResult {
  success: boolean;
  count?: number;
  updatedAt?: string;
  subjects?: Array<{ code: string; subject: string; conducted: number | null; attended: number | null; percentage: number | null }>;
  error?: string;
  step?: string;
}

export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();

  if (me.role !== "student") {
    throw new ApiError(403, "Only student accounts can sync attendance from IMS.");
  }

  // Optional IMS session from the native login panel (one-time use).
  const body = await readBody<{ imsToken?: string }>(req).catch(() => ({ imsToken: undefined }));

  if (syncInProgress) {
    throw new ApiError(429, "An attendance sync is already in progress. Please wait for it to finish.");
  }

  let imsSessionCookie: string | null = null;
  if (body.imsToken) {
    imsSessionCookie = consumeIMSSession(body.imsToken);
    if (!imsSessionCookie) {
      throw new ApiError(400, "The IMS connection expired before syncing. Please connect to NSUT IMS again.");
    }
  }

  // Check Python availability.
  const pythonCheck = await checkPythonAvailable();
  if (!pythonCheck.ok) {
    throw new ApiError(500, pythonCheck.message);
  }

  // Check Selenium availability.
  const seleniumCheck = await checkSeleniumAvailable();
  if (!seleniumCheck.ok) {
    throw new ApiError(500, seleniumCheck.message);
  }

  syncInProgress = true;
  syncProgress = { step: "starting", message: "Opening IMS login…" };

  try {
    const projectRoot = path.resolve(process.cwd());
    const scriptPath = path.join(projectRoot, "scripts", "nsut.py");

    syncProgress = { step: "waiting_for_login", message: "Waiting for NSUT login…" };

    const result: SyncResult = await new Promise((resolve) => {
      const proc = spawn("python", [scriptPath, "--auto"], {
        cwd: projectRoot,
        timeout: 300000, // 5 minutes max
        windowsHide: true,
        // Session cookie travels via the environment (not argv, not logged)
        // and exists only for the lifetime of this child process.
        env: imsSessionCookie
          ? { ...process.env, NSUT_IMS_SESSION: imsSessionCookie }
          : process.env,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("error", (err) => {
        resolve({ success: false, error: `Failed to launch Python: ${err.message}`, step: "launch" });
      });

      proc.on("close", (code) => {
        if (code === null) {
          resolve({
            success: false,
            error: "The attendance extractor timed out (5-minute limit). Please try again.",
            step: "timeout",
          });
          return;
        }

        if (code !== 0) {
          const lines = stderr
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

          // Diagnostic only: nsut.py logs navigation/status lines — never
          // credentials, CAPTCHA answers, or the IMS session cookie.
          console.warn("[sync] extractor exited", { code, tail: lines.slice(-5) });

          // Prefer the explicit ERROR line; fall back to the last log line so
          // the UI shows the real reason instead of a generic failure.
          const errorLine = [...lines].reverse().find((l) => /^ERROR:/i.test(l));
          resolve({
            success: false,
            error: errorLine ?? (lines.length ? lines[lines.length - 1] : `Python script exited with code ${code}.`),
            step: "script",
          });
          return;
        }

        // Script finished; move from login wait to report fetching.
        syncProgress = { step: "fetching_attendance", message: "Fetching attendance…" };

        // Parse JSON from stdout using delimiters.
        const startMarker = "===ATTENDANCE_JSON_START===";
        const endMarker = "===ATTENDANCE_JSON_END===";
        const startIdx = stdout.indexOf(startMarker);
        const endIdx = stdout.indexOf(endMarker);

        if (startIdx === -1 || endIdx === -1) {
          resolve({
            success: false,
            error: "The script completed but did not produce attendance data. Please check the Chrome browser window.",
            step: "parse",
          });
          return;
        }

        const jsonStr = stdout.slice(startIdx + startMarker.length, endIdx).trim();

        let data: {
          source: string;
          academicYear: string;
          semester: string;
          exportedAt: string;
          subjects: Array<{
            code: string;
            subject: string;
            conducted: number | null;
            attended: number | null;
            absent: number | null;
            percentage: number | null;
          }>;
        };

        try {
          data = JSON.parse(jsonStr);
        } catch {
          resolve({
            success: false,
            error: "The script produced invalid JSON data.",
            step: "parse",
          });
          return;
        }

        // Validate extracted data.
        if (!data.subjects || !Array.isArray(data.subjects) || data.subjects.length === 0) {
          resolve({
            success: false,
            error: "No attendance subjects were found in the extracted data.",
            step: "validate",
          });
          return;
        }

        // Convert to import format.
        interface SubjectResult {
          code: string;
          subject: string;
          conducted: number | null;
          attended: number | null;
          percentage: number | null;
        }

        const subjects: SubjectResult[] = data.subjects
          .filter((s) => s.code && s.subject && s.conducted !== null && s.attended !== null)
          .map((s) => ({
            code: (s.code ?? "").trim(),
            subject: (s.subject ?? s.code ?? "Unknown").trim(),
            conducted: s.conducted ?? 0,
            attended: s.attended ?? 0,
            percentage: s.percentage ?? null,
          }));

        if (subjects.length === 0) {
          resolve({
            success: false,
            error: "No valid attendance subjects were found. The report format may have changed.",
            step: "validate",
          });
          return;
        }

        // Use exportedAt as importKey for dedup.
        const importKey = `selenium-${data.exportedAt}`;

        // Check if already imported.
        const db = getDB();
        const existingWithKey = db.attendance.find(
          (a) => a.studentId === me.id && (a as AttendanceRecordWithImportKey).importKey === importKey,
        );

        if (existingWithKey) {
          resolve({
            success: true,
            count: subjects.length,
            updatedAt: data.exportedAt,
            subjects,
            // Already imported - treat as success.
          });
          return;
        }

        syncProgress = { step: "importing_attendance", message: "Importing attendance…" };

        // Save records. Use upsert logic: update existing student-imported records
        // for the same subject instead of creating duplicates.
        const ts = now();

        mutate((db) => {
          // Remove previous Selenium-imported records for this student for the same subject codes.
          const subjectCodes = new Set(subjects.map((s) => s.code?.toLowerCase()));
          db.attendance = db.attendance.filter(
            (a) =>
              !(a.studentId === me.id && (a as AttendanceRecordWithImportKey).source === "selenium" && subjectCodes.has(a.code?.toLowerCase())),
          );

          db.attendance.push(
            ...subjects.map((s) => ({
              id: uid(),
              studentId: me.id,
              subject: s.subject,
              code: s.code ?? "",
              conducted: s.conducted ?? 0,
              attended: s.attended ?? 0,
              minRequired: 75,
              updatedAt: ts,
              importKey,
              importedAt: ts,
              source: "selenium",
            })),
          );
        });

        resolve({
          success: true,
          count: subjects.length,
          updatedAt: data.exportedAt,
          subjects,
        });
      });
    });

    if (!result.success) {
      syncProgress = { step: "error", message: result.error ?? "Sync failed unexpectedly." };
      throw new ApiError(500, result.error ?? "Sync failed unexpectedly.");
    }

    syncProgress = { step: "success", message: "Sync complete" };
    return json({
      saved: true,
      count: result.count,
      subjects: result.subjects,
      updatedAt: result.updatedAt,
    });
  } finally {
    // Keep the final status visible for polling clients; reset the lock only.
    syncInProgress = false;
  }
});

/** Type extension for student-imported records. */
type AttendanceRecordWithImportKey = {
  studentId: string;
  importKey?: string;
  source?: string;
};

/** GET endpoint to check sync dependencies without running. */
export const GET = handler(async (req: NextRequest) => {
  if (req?.nextUrl?.searchParams?.get("status") === "1") {
    return json({
      inProgress: syncInProgress,
      step: syncProgress.step,
      message: syncProgress.message,
    });
  }

  const pythonCheck = await checkPythonAvailable();
  const seleniumCheck = await checkSeleniumAvailable();
  return json({
    python: pythonCheck,
    selenium: seleniumCheck,
    isLocal: true,
  });
});
