/**
 * CampusConnect Attendance Sync Bookmarklet
 * ------------------------------------------
 * Runs entirely in the student's browser on the official NSUT IMS page.
 * Extracts only attendance table data — never credentials, cookies, or tokens.
 *
 * Usage:
 *   1. Save this file as a bookmark (prefix with javascript: if needed).
 *   2. Log in to https://imsnsit.org/imsnsit/ and navigate to your attendance report.
 *   3. Run the bookmarklet.
 *   4. Review the extracted data and click "Download JSON".
 *   5. Import the JSON file in CampusConnect → Academics → Attendance.
 */
(function () {
  "use strict";

  /* ---------- helpers ---------- */

  function text(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isAttendanceTable(tbl) {
    const txt = tbl.textContent || "";
    const hay = txt.toLowerCase();
    const score =
      (hay.includes("conducted") ? 1 : 0) +
      (hay.includes("attended") ? 1 : 0) +
      (hay.includes("absent") ? 1 : 0) +
      (hay.includes("total") ? 1 : 0) +
      (hay.includes("subject") ? 1 : 0) +
      (hay.includes("class") ? 1 : 0);
    return score >= 3;
  }

  function findAttendanceTables() {
    return Array.from(document.querySelectorAll("table")).filter(isAttendanceTable);
  }

  /* ---------- extract from a table ---------- */

  function parseTable(tbl) {
    const rows = Array.from(tbl.querySelectorAll("tr"));
    if (rows.length === 0) return null;

    // Try to find a header row containing subject-like labels.
    let headerRowIdx = -1;
    let headers = [];
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const cells = Array.from(rows[i].querySelectorAll("th, td")).map(text);
      const joined = cells.join(" ").toLowerCase();
      if (
        joined.includes("conducted") ||
        joined.includes("attended") ||
        joined.includes("total") ||
        joined.includes("subject")
      ) {
        headerRowIdx = i;
        headers = cells;
        break;
      }
    }

    const dataRows = headerRowIdx >= 0 ? rows.slice(headerRowIdx + 1) : rows;

    // Parse summary rows: look for cells with "conducted attended" pattern or numeric pairs.
    const subjects = [];
    let remarks = "";

    for (const row of dataRows) {
      const cells = Array.from(row.querySelectorAll("th, td")).map(text);
      if (cells.length < 2) continue;

      const first = cells[0] || "";

      // Skip obvious header / label rows.
      if (first.toLowerCase().includes("conducted") && first.toLowerCase().includes("attended")) continue;
      if (first.toLowerCase() === "total" || first.toLowerCase() === "grand total") continue;

      // Try to extract a numeric pair from the last two cells.
      const numericCells = cells.slice(-2).map((c) => parseInt(c, 10));
      if (numericCells.length === 2 && !isNaN(numericCells[0]) && !isNaN(numericCells[1])) {
        const conducted = numericCells[0];
        const attended = numericCells[1];
        const subjectName = first || "Unknown";
        const code = cells[1] && cells[1] !== String(conducted) ? cells[1] : "";
        subjects.push({ subject: subjectName, code, conducted, attended, remarks: "" });
      } else if (cells.length >= 3) {
        // Handle "0+0" or "CS" style values in the middle.
        const joined = cells.join(" ");
        const match = joined.match(/(\d+)\s*\+\s*(\d+)/);
        if (match) {
          const conducted = parseInt(match[1], 10);
          const attended = parseInt(match[2], 10);
          subjects.push({ subject: first, code: "", conducted, attended, remarks: joined });
        } else if (joined.toLowerCase().includes("cs")) {
          subjects.push({ subject: first, code: "", conducted: 0, attended: 0, remarks: joined });
        }
      }
    }

    // Try to find a grand-total row.
    let totalConducted = null;
    let totalAttended = null;
    for (const row of dataRows) {
      const cells = Array.from(row.querySelectorAll("th, td")).map(text);
      const joined = cells.join(" ").toLowerCase();
      if (joined.includes("grand total") || joined.includes("total")) {
        const nums = cells.map((c) => parseInt(c, 10)).filter((n) => !isNaN(n));
        if (nums.length >= 2) {
          totalConducted = nums[nums.length - 2];
          totalAttended = nums[nums.length - 1];
        }
      }
    }

    if (subjects.length === 0) return null;
    return { subjects, totalConducted, totalAttended };
  }

  /* ---------- extract attendance ---------- */

  function extractAttendance() {
    const tables = findAttendanceTables();
    if (tables.length === 0) {
      return { error: "No attendance table found on this page. Make sure you are on the IMS attendance report." };
    }

    let best = null;
    for (const tbl of tables) {
      const parsed = parseTable(tbl);
      if (parsed && (!best || parsed.subjects.length > best.subjects.length)) {
        best = parsed;
      }
    }

    if (!best) {
      return { error: "Found tables but could not parse attendance data. The page format may be unsupported." };
    }

    return {
      source: "nsut-ims-bookmarklet",
      extractedAt: new Date().toISOString(),
      pageUrl: window.location.href,
      subjects: best.subjects,
      totalConducted: best.totalConducted,
      totalAttended: best.totalAttended,
    };
  }

  /* ---------- preview & download UI ---------- */

  function showPreview(data) {
    // Remove any existing panel.
    document.getElementById("cc-att-sync")?.remove();

    const panel = document.createElement("div");
    panel.id = "cc-att-sync";
    panel.style.cssText = [
      "position:fixed", "top:20px", "right:20px", "width:420px", "max-height:80vh",
      "overflow-y:auto", "background:#fff", "border:2px solid #6366f1", "border-radius:16px",
      "box-shadow:0 20px 60px rgba(0,0,0,0.3)", "z-index:999999", "padding:20px",
      "font-family:system-ui,-apple-system,sans-serif", "color:#111827",
    ].join(";");

    const error = data.error;
    const subjects = data.subjects || [];

    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <strong style="font-size:17px">CampusConnect Attendance</strong>
      <button onclick="document.getElementById('cc-att-sync').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">&times;</button>
    </div>`;

    if (error) {
      html += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;color:#b91c1c;font-size:14px">
        <strong>Could not extract attendance</strong>
        <p style="margin:6px 0 0">${error}</p>
      </div>`;
    } else {
      html += `<p style="font-size:13px;color:#6b7280;margin-bottom:12px">
        Found <strong>${subjects.length}</strong> subject${subjects.length !== 1 ? "s" : ""} on this page.
        Review the data below, then download and import into CampusConnect.
      </p>`;

      html += `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:8px;text-align:left">Subject</th>
          <th style="padding:8px;text-align:right">Conducted</th>
          <th style="padding:8px;text-align:right">Attended</th>
          <th style="padding:8px;text-align:right">%</th>
        </tr></thead>
        <tbody>`;

      for (const s of subjects) {
        const pct = s.conducted > 0 ? Math.round((s.attended / s.conducted) * 1000) / 10 : 0;
        html += `<tr style="border-top:1px solid #e5e7eb">
          <td style="padding:7px 8px">${s.subject}${s.code ? `<br><span style="font-size:11px;color:#9ca3af">${s.code}</span>` : ""}</td>
          <td style="padding:7px 8px;text-align:right">${s.conducted}</td>
          <td style="padding:7px 8px;text-align:right">${s.attended}</td>
          <td style="padding:7px 8px;text-align:right;font-weight:600">${pct}%</td>
        </tr>`;
      }

      html += `</tbody></table>`;

      if (data.totalConducted != null && data.totalAttended != null) {
        const pct = data.totalConducted > 0 ? Math.round((data.totalAttended / data.totalConducted) * 1000) / 10 : 0;
        html += `<p style="font-size:13px;color:#374151;margin-bottom:12px">
          <strong>Grand total:</strong> ${data.totalAttended}/${data.totalConducted} (${pct}%)
        </p>`;
      }

      // Check for discrepancies.
      const sumConducted = subjects.reduce((a, s) => a + s.conducted, 0);
      const sumAttended = subjects.reduce((a, s) => a + s.attended, 0);
      if (
        data.totalConducted != null &&
        (sumConducted !== data.totalConducted || sumAttended !== data.totalAttended)
      ) {
        html += `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:12px;color:#92400e;margin-bottom:12px">
          <strong>Warning:</strong> Subject totals (${sumAttended}/${sumConducted}) do not match the grand total (${data.totalAttended}/${data.totalConducted}). Please verify before importing.
        </div>`;
      }

      html += `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="cc-att-download" style="background:#6366f1;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;flex:1">
          Download JSON
        </button>
        <button onclick="document.getElementById('cc-att-sync').remove()" style="background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:10px;padding:10px 18px;font-size:14px;cursor:pointer">
          Close
        </button>
      </div>`;

      html += `<p style="font-size:11px;color:#9ca3af;margin-top:10px">
        Data stays on your device. No credentials or session data is sent anywhere.
      </p>`;
    }

    panel.innerHTML = html;
    document.body.appendChild(panel);

    // Wire download button.
    if (!error) {
      document.getElementById("cc-att-download")?.addEventListener("click", function () {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  /* ---------- run ---------- */

  const result = extractAttendance();
  showPreview(result);
})();
