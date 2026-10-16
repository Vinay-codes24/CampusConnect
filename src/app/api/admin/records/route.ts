import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate, now, uid } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DEPARTMENTS, SEMESTERS, type AppNotification, type Database } from "@/lib/types";
import { isoDate, oneOf, optional, str, strings } from "@/lib/validation";

const KINDS = ["announcement", "syllabus", "material", "exam", "attendance", "timetable", "scholarship"] as const;
type Kind = (typeof KINDS)[number];

/**
 * POST /api/admin/records — publish an official academic record.
 * DELETE /api/admin/records — remove one.
 *
 * Role policy: faculty and admins publish academic records; admins additionally
 * manage scholarships. Organizers only manage events (see /api/events).
 */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireRole("faculty", "admin");
  const body = await readBody(req);
  const kind = oneOf(body.kind, KINDS, "record type") as Kind;
  const data = (body.data ?? {}) as Record<string, unknown>;

  if (kind === "scholarship" && me.role !== "admin") {
    throw new ApiError(403, "Only administrators can publish official scholarships.");
  }

  let summary = "";
  let link = "/academics";

  mutate((db) => {
    switch (kind) {
      case "announcement": {
        const title = str(data.title, { field: "Title", min: 4, max: 140 });
        const message = str(data.body, { field: "Message", min: 10, max: 2000 });
        const important = data.important === true;
        broadcast(db, title, message, "/academics/notifications", important, me.id);
        summary = "Announcement published to every student.";
        link = "/academics/notifications";
        break;
      }
      case "syllabus": {
        const record = {
          id: uid(),
          department: oneOf(data.department, DEPARTMENTS, "department"),
          semester: oneOf(data.semester, SEMESTERS, "semester"),
          subject: str(data.subject, { field: "Subject", min: 2, max: 90 }),
          code: str(data.code, { field: "Subject code", min: 2, max: 16 }),
          credits: Number(data.credits ?? 3) || 3,
          units: Array.isArray(data.units)
            ? (data.units as { title: string; topics: string[] }[]).slice(0, 12).map((u) => ({
                title: String(u.title ?? "").slice(0, 120),
                topics: (Array.isArray(u.topics) ? u.topics : []).map((t) => String(t).slice(0, 160)).slice(0, 20),
              }))
            : [],
          docUrl: typeof data.docUrl === "string" ? data.docUrl : null,
          updatedAt: now(),
          uploadedBy: me.id,
        };
        db.syllabus.push(record);
        broadcast(db, `Syllabus updated — ${record.subject}`, `${record.department} · ${record.semester} · ${record.code}`, "/academics/syllabus", false, me.id);
        summary = `Syllabus published for ${record.subject}.`;
        link = "/academics/syllabus";
        break;
      }
      case "material": {
        const record = {
          id: uid(),
          department: oneOf(data.department, DEPARTMENTS, "department"),
          semester: oneOf(data.semester, SEMESTERS, "semester"),
          subject: str(data.subject, { field: "Subject", min: 2, max: 90 }),
          title: str(data.title, { field: "Title", min: 3, max: 140 }),
          type: oneOf(data.type, ["Notes", "Previous Year Paper", "Lab Manual", "Assignment", "Reference"], "material type"),
          url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "",
          size: Number(data.size ?? 0) || 0,
          downloads: 0,
          uploadedBy: me.id,
          createdAt: now(),
        };
        if (!record.url) throw new ApiError(400, "Upload the file before publishing the material.");
        db.materials.push(record);
        broadcast(db, `New study material — ${record.title}`, `${record.subject} · ${record.department}`, "/academics/study-materials", false, me.id);
        summary = `Material published: ${record.title}.`;
        link = "/academics/study-materials";
        break;
      }
      case "exam": {
        const record = {
          id: uid(),
          name: str(data.name, { field: "Exam name", min: 3, max: 120 }),
          subject: str(data.subject, { field: "Subject", min: 2, max: 90 }),
          code: str(data.code, { field: "Subject code", min: 2, max: 16 }),
          date: isoDate(data.date, "Exam date"),
          startTime: str(data.startTime, { field: "Start time" }),
          endTime: str(data.endTime, { field: "End time" }),
          venue: str(data.venue, { field: "Venue", min: 2, max: 120 }),
          type: oneOf(data.type, ["Semester", "Internal", "Lab", "Backlog"], "exam type"),
          instructions: optional(data.instructions, 800),
          important: data.important === true,
        };
        db.exams.push(record);
        db.exams.sort((a, b) => a.date.localeCompare(b.date));
        broadcast(db, `Exam scheduled — ${record.subject}`, `${record.date.slice(0, 10)} · ${record.startTime}–${record.endTime} · ${record.venue}`, "/academics/exam-schedule", record.important, me.id);
        summary = `Exam added for ${record.subject}.`;
        link = "/academics/exam-schedule";
        break;
      }
      case "attendance": {
        const studentId = str(data.studentId, { field: "Student" });
        const student = db.users.find((u) => u.id === studentId);
        if (!student) throw new ApiError(404, "That student does not exist.");
        const conducted = Number(data.conducted ?? 0);
        const attended = Number(data.attended ?? 0);
        if (conducted < 0 || attended < 0 || attended > conducted) {
          throw new ApiError(400, "Attended classes cannot exceed classes conducted.");
        }
        const subject = str(data.subject, { field: "Subject", min: 2, max: 90 });
        const existing = db.attendance.find((a) => a.studentId === studentId && a.subject === subject);
        if (existing) {
          existing.conducted = conducted;
          existing.attended = attended;
          existing.minRequired = Number(data.minRequired ?? existing.minRequired) || 75;
          existing.updatedAt = now();
        } else {
          db.attendance.push({
            id: uid(),
            studentId,
            subject,
            code: optional(data.code, 16) || "—",
            conducted,
            attended,
            minRequired: Number(data.minRequired ?? 75) || 75,
            updatedAt: now(),
          });
        }
        const pct = conducted ? Math.round((attended / conducted) * 100) : 0;
        if (pct < 75) {
          push(db, studentId, "Attendance updated", `Your attendance in ${subject} is ${pct}%, below the 75% requirement.`, "/academics/attendance", true, true);
        }
        summary = `Attendance updated for ${student.name} in ${subject} (${pct}%).`;
        link = "/academics/attendance";
        break;
      }
      case "timetable": {
        const department = oneOf(data.department, DEPARTMENTS, "department");
        const year = oneOf(data.year, ["1st Year", "2nd Year", "3rd Year", "4th Year"], "year");
        const slots = Array.isArray(data.slots) ? (data.slots as never[]) : [];
        if (slots.length === 0) throw new ApiError(400, "The timetable needs at least one class slot.");
        const existing = db.timetables.find((t) => t.department === department && t.year === year);
        if (existing) {
          existing.slots = slots as Database["timetables"][number]["slots"];
          existing.updatedAt = now();
          existing.uploadedBy = me.id;
        } else {
          db.timetables.push({
            id: uid(),
            department,
            year,
            slots: slots as Database["timetables"][number]["slots"],
            updatedAt: now(),
            uploadedBy: me.id,
          });
        }
        broadcast(db, `Timetable published — ${department}, ${year}`, "The class timetable has been updated. Check the Academics dashboard.", "/academics/timetable", false, me.id);
        summary = `Timetable saved for ${department}, ${year}.`;
        link = "/academics/timetable";
        break;
      }
      case "scholarship": {
        const record = {
          id: uid(),
          name: str(data.name, { field: "Scholarship name", min: 3, max: 140 }),
          provider: str(data.provider, { field: "Provider", min: 2, max: 120 }),
          eligibility: str(data.eligibility, { field: "Eligibility", min: 10, max: 600 }),
          amount: optional(data.amount, 80) || "Amount not specified",
          deadline: isoDate(data.deadline, "Deadline"),
          documents: strings(data.documents, 12),
          applyUrl: optional(data.applyUrl, 300),
          description: optional(data.description, 1200),
          source: "Official" as const,
          updatedAt: now(),
        };
        db.scholarships.push(record);
        broadcast(db, `New scholarship — ${record.name}`, `${record.amount} · applications close ${record.deadline.slice(0, 10)}`, "/academics/scholarships", false, me.id);
        summary = `Scholarship published: ${record.name}.`;
        link = "/academics/scholarships";
        break;
      }
    }
  });

  return json({ ok: true, summary, link }, 201);
});

/** DELETE /api/admin/records { kind, id } */
export const DELETE = handler(async (req: NextRequest) => {
  await requireRole("faculty", "admin");
  const body = await readBody(req);
  const kind = oneOf(body.kind, KINDS, "record type");
  const id = str(body.id, { field: "Record" });

  mutate((db) => {
    switch (kind) {
      case "syllabus":
        db.syllabus = db.syllabus.filter((x) => x.id !== id);
        break;
      case "material":
        db.materials = db.materials.filter((x) => x.id !== id);
        break;
      case "exam":
        db.exams = db.exams.filter((x) => x.id !== id);
        break;
      case "attendance":
        db.attendance = db.attendance.filter((x) => x.id !== id);
        break;
      case "scholarship":
        db.scholarships = db.scholarships.filter((x) => x.id !== id);
        break;
      default:
        throw new ApiError(400, "That record type cannot be deleted here.");
    }
  });

  return json({ ok: true });
});

function broadcast(db: Database, title: string, body: string, link: string, important: boolean, authorId: string) {
  db.users.forEach((u) => {
    if (u.id === authorId) return;
    if (!u.notificationPrefs.academic && !important) return;
    push(db, u.id, title, body, link, important, u.notificationPrefs.academic || important);
  });
}

function push(
  db: Database,
  userId: string,
  title: string,
  body: string,
  link: string,
  important: boolean,
  allowed: boolean,
) {
  if (!allowed) return;
  const notification: AppNotification = {
    id: uid(),
    userId,
    type: "academic",
    title,
    body,
    link,
    important,
    createdAt: now(),
  };
  db.notifications.push(notification);
}
