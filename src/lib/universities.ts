/** Stable identifiers for supported universities. Never trust raw browser input. */
export type UniversityId = "dtu" | "igdtuw" | "nsut" | "iiitd";

export const UNIVERSITY_IDS: UniversityId[] = ["dtu", "igdtuw", "nsut", "iiitd"];

/** A verified holiday entry. Dates are ISO "YYYY-MM-DD". */
export interface UniversityHoliday {
  id: string;
  name: string;
  date: string;
  type: "National" | "Festival" | "Institutional" | "Break";
}

export interface University {
  id: UniversityId;
  shortName: string;
  name: string;
  location: string;
  /**
   * Automated attendance integration for this university, if one has been
   * implemented and verified. `null` means students see a "not configured"
   * empty state instead of a sync button.
   */
  attendanceIntegration: "nsut-ims" | null;
  /**
   * Verified, university-specific holiday calendar. Intentionally empty until
   * an official source is configured — the UI shows a clear empty state rather
   * than fabricating holidays.
   */
  holidays: UniversityHoliday[];
}

export const UNIVERSITIES: University[] = [
  {
    id: "dtu",
    shortName: "DTU",
    name: "Delhi Technological University",
    location: "Delhi",
    attendanceIntegration: null,
    holidays: [],
  },
  {
    id: "igdtuw",
    shortName: "IGDTUW",
    name: "Indira Gandhi Delhi Technical University for Women",
    location: "Delhi",
    attendanceIntegration: null,
    holidays: [],
  },
  {
    id: "nsut",
    shortName: "NSUT",
    name: "Netaji Subhas University of Technology",
    location: "Delhi",
    attendanceIntegration: "nsut-ims",
    holidays: [],
  },
  {
    id: "iiitd",
    shortName: "IIIT-Delhi",
    name: "Indraprastha Institute of Information Technology Delhi",
    location: "Delhi",
    attendanceIntegration: null,
    holidays: [],
  },
];

export function findUniversity(id: string | null | undefined): University | null {
  if (!id) return null;
  const normalized = id.trim().toLowerCase();
  return UNIVERSITIES.find((u) => u.id === normalized) ?? null;
}

export function coerceUniversityId(value: unknown): UniversityId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return (UNIVERSITIES.some((u) => u.id === normalized) ? normalized : null) as UniversityId | null;
}

export function isValidUniversityId(value: unknown): value is UniversityId {
  return coerceUniversityId(value) !== null;
}

export const UNIVERSITY_STORAGE_KEY = "campusconnect:university";

export function readStoredUniversity(): UniversityId | null {
  if (typeof window === "undefined") return null;
  try {
    return coerceUniversityId(window.localStorage.getItem(UNIVERSITY_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredUniversity(id: UniversityId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UNIVERSITY_STORAGE_KEY, id);
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
}

export function clearStoredUniversity(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(UNIVERSITY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
