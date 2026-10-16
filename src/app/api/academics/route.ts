import { NextRequest } from "next/server";
import { handler, json } from "@/lib/api";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * GET /api/academics — everything the signed-in student's dashboard needs.
 *
 * Privacy: attendance records are only ever returned for the requesting user.
 * Official records (syllabus, materials, exams, timetables) are readable by
 * any signed-in student; only faculty/admin can modify them.
 */
export const GET = handler(async (_req: NextRequest) => {
  const me = await requireUser();
  const db = getDB();

  return json({
    viewer: {
      id: me.id,
      department: me.department ?? "Computer Science & Engineering",
      year: me.year ?? "3rd Year",
      role: me.role,
    },
    syllabus: db.syllabus,
    scholarships: db.scholarships.sort((a, b) => a.deadline.localeCompare(b.deadline)),
    attendance: db.attendance.filter((a) => a.studentId === me.id),
    timetables: db.timetables,
    materials: db.materials.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    exams: db.exams.sort((a, b) => a.date.localeCompare(b.date)),
    demo: true,
  });
});
