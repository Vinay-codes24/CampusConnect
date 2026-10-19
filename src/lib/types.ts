// ---------------------------------------------------------------------------
// CampusConnect domain types
// Every collection below maps 1:1 to a table in a production PostgreSQL schema.
// In demo mode these are persisted to data/db.json through src/lib/db.ts.
// ---------------------------------------------------------------------------

import type { UniversityId } from "./universities";

export type Role = "student" | "faculty" | "organizer" | "admin";

export const ROLES: Role[] = ["student", "faculty", "organizer", "admin"];

export interface NotificationPrefs {
  replies: boolean;
  postInteractions: boolean;
  eventReminders: boolean;
  academic: boolean;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  username: string;
  role: Role;
  avatar: string | null;
  department: string | null;
  year: string | null;
  interests: string[];
  bio: string;
  verified: boolean;
  createdAt: string;
  notificationPrefs: NotificationPrefs;
  /** Preferred campus identifier validated against the allowlist. */
  university?: string | null;
}

/** Safe, public projection of a User (never leaks credentials). */
export type PublicUser = Omit<User, "passwordHash" | "salt" | "email"> & {
  email?: string;
};

export type Session = {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type MediaKind = "image" | "video" | "file";

export interface Media {
  kind: MediaKind;
  url: string;
  name: string;
  size: number;
}

export type PostCategory =
  | "Question"
  | "Study Resources"
  | "Campus Life"
  | "Memes"
  | "Announcement"
  | "Discussion"
  | "Kalesh"
  | "Tea"
  | "Gossips"
  | "Rant"
  | "Jobs";

export const POST_CATEGORIES: PostCategory[] = [
  "Question",
  "Study Resources",
  "Campus Life",
  "Memes",
  "Announcement",
  "Discussion",
  "Kalesh",
  "Tea",
  "Gossips",
  "Rant",
  "Jobs",
];

// --------------------------- College communities --------------------------
// Structured post metadata (Reddit-style college communities). These are
// database fields, never free-text hashtags.

/** The college community a post belongs to (shared with the campus picker). */
export type PostCollege = UniversityId;

export type Program = "B.Tech" | "BBA" | "Design" | "M.Tech" | "MBA";

export const PROGRAMS: Program[] = ["B.Tech", "BBA", "Design", "M.Tech", "MBA"];

export type YearStatus = "1st Year" | "2nd Year" | "3rd Year" | "4th Year" | "Alumni";

export const YEAR_STATUSES: YearStatus[] = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Alumni",
];

export interface Community {
  id: string;
  name: string;
  /** Short label shown in chips, e.g. "r/CSE". */
  slug: string;
  description: string;
  /** Baseline membership count from the demo seed. */
  members: number;
  /** Icon key resolved in `components/posts/sidebar.tsx`. */
  icon: string;
  /** Tone key: brand | accent | sky | violet | rose | amber. */
  tone: string;
}

export interface CommunityMember {
  id: string;
  userId: string;
  communityId: string;
  joinedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  /** Optional community ("subreddit") this post belongs to. */
  communityId: string | null;
  title: string;
  body: string;
  category: PostCategory;
  media: Media[];
  createdAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  removed: boolean;
  /** College community (self-selected structured field). */
  college?: PostCollege | null;
  /** Degree programme tag; posts created before this field existed have none. */
  program?: Program | null;
  /** Year or status tag ("Alumni" counts as a status). */
  yearStatus?: YearStatus | null;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  removed: boolean;
}

export type VoteTarget = "post" | "comment";

export interface Vote {
  userId: string;
  target: VoteTarget;
  targetId: string;
  /** 1 = upvote, -1 = downvote. One row per (user, target). */
  value: 1 | -1;
  createdAt: string;
}

export type ReportReason =
  | "Spam"
  | "Harassment or bullying"
  | "Inappropriate content"
  | "Fake information"
  | "Other";

export const REPORT_REASONS: ReportReason[] = [
  "Spam",
  "Harassment or bullying",
  "Inappropriate content",
  "Fake information",
  "Other",
];

export interface Report {
  id: string;
  target: VoteTarget;
  targetId: string;
  reporterId: string;
  reason: ReportReason;
  details: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  resolution: string | null;
  resolvedBy: string | null;
}

export type EventCategory =
  | "Hackathon"
  | "Technical Workshop"
  | "Cultural Festival"
  | "College Fest"
  | "Sports"
  | "Seminar"
  | "Guest Lecture"
  | "Club Activity"
  | "Placement & Career"
  | "Competition";

export const EVENT_CATEGORIES: EventCategory[] = [
  "Hackathon",
  "Technical Workshop",
  "Cultural Festival",
  "College Fest",
  "Sports",
  "Seminar",
  "Guest Lecture",
  "Club Activity",
  "Placement & Career",
  "Competition",
];

/** High level grouping used by the event filter bar. */
export type EventGroup = "Technical" | "Cultural" | "Sports" | "Academic" | "Career";

export const EVENT_GROUP_BY_CATEGORY: Record<EventCategory, EventGroup> = {
  Hackathon: "Technical",
  "Technical Workshop": "Technical",
  Competition: "Technical",
  "Cultural Festival": "Cultural",
  "College Fest": "Cultural",
  "Club Activity": "Cultural",
  Sports: "Sports",
  Seminar: "Academic",
  "Guest Lecture": "Academic",
  "Placement & Career": "Career",
};

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  banner: string | null;
  start: string;
  end: string;
  venue: string;
  organizer: string;
  organizerId: string;
  deadline: string | null;
  seats: number | null;
  eligibility: string;
  instructions: string;
  registrationUrl: string;
  createdBy: string;
  createdAt: string;
  published: boolean;
  /** Free-form related announcements shown on the detail page. */
  related: string[];
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: "registered" | "cancelled";
  createdAt: string;
}

export type NotificationType =
  | "reply"
  | "post_interaction"
  | "event_registration"
  | "event_reminder"
  | "academic"
  | "moderation"
  | "system";

export interface AppNotification {
  id: string;
  /** "*" broadcasts to every user (official announcements). */
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  important: boolean;
  createdAt: string;
}

export interface ReadMarker {
  userId: string;
  notificationId: string;
}

// --------------------------- Academics ------------------------------------

export interface SyllabusUnit {
  title: string;
  topics: string[];
}

export interface SyllabusSubject {
  id: string;
  department: string;
  semester: string;
  subject: string;
  code: string;
  credits: number;
  units: SyllabusUnit[];
  docUrl: string | null;
  updatedAt: string;
  uploadedBy: string;
}

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  eligibility: string;
  amount: string;
  deadline: string;
  documents: string[];
  applyUrl: string;
  description: string;
  /** "Official" = verified by an administrator, "Community" = student submitted. */
  source: "Official" | "Community";
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subject: string;
  code: string;
  conducted: number;
  attended: number;
  minRequired: number;
  updatedAt: string;
  /** Present for student-imported records (bookmarklet/selenium). */
  importKey?: string;
  importedAt?: string;
  /** "selenium" or "bookmarklet" when imported by the student; unset for faculty-managed. */
  source?: string;
}

export type DayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface Slot {
  id: string;
  day: DayName;
  start: string;
  end: string;
  subject: string;
  faculty: string;
  room: string;
  kind: "class" | "lab" | "break";
}

export interface Timetable {
  id: string;
  department: string;
  year: string;
  slots: Slot[];
  updatedAt: string;
  uploadedBy: string;
}

export type MaterialType = "Notes" | "Previous Year Paper" | "Lab Manual" | "Assignment" | "Reference";

export interface Material {
  id: string;
  department: string;
  semester: string;
  subject: string;
  title: string;
  type: MaterialType;
  url: string;
  size: number;
  downloads: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Exam {
  id: string;
  name: string;
  subject: string;
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  type: "Semester" | "Internal" | "Lab" | "Backlog";
  instructions: string;
  important: boolean;
}

export const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Technology",
  "Business Administration",
];

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
export const SEMESTERS = ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"];

// --------------------------- Societies -------------------------------------
//
// College societies are VERIFIED records only — no clubs, members, contacts,
// achievements or links are invented. Datasets are stored separately from the
// UI (see src/lib/societies-data.ts) and seeded into `db.societies` only when
// the collection is still empty. The UI renders its empty state rather than
// fabricating records when no dataset has been loaded.
//
// The array order is the canonical display order used by the category filter
// chips on the Societies page.

export const SOCIETY_CATEGORIES = [
  // Groups used by the NSUT societies & clubs directory.
  "Recreational Clubs",
  "Technical Societies",
  "Non-Technical Societies",
  "Literary Clubs",
  "Automotive Clubs",
  "Community Service Initiatives",
  // Generic groups kept for other colleges' societies.
  "Technical",
  "Coding",
  "Robotics",
  "Cultural",
  "Music",
  "Dance",
  "Drama",
  "Photography",
  "Literary",
  "Entrepreneurship",
  "Social Impact",
  "Sports",
  "Design",
  "Research",
] as const;

/** Canonical rank of a category for list/filter ordering. Unknown ones go last. */
export function societyCategoryRank(category: string): number {
  const index = (SOCIETY_CATEGORIES as readonly string[]).indexOf(category);
  return index === -1 ? SOCIETY_CATEGORIES.length : index;
}

export type SocietyCategory = (typeof SOCIETY_CATEGORIES)[number];

export interface SocietyMember {
  id: string;
  userId: string;
  societyId: string;
  joinedAt: string;
}

export interface Society {
  id: string;
  collegeId: UniversityId;
  name: string;
  category: SocietyCategory;
  /** One-line summary used on cards and headers. */
  shortDescription: string;
  /** Full description stored on the details page. */
  fullDescription: string;
  /** Optional short tagline if verified. */
  tagline: string | null;
  /** Verified image URL if one is available. */
  logo: string | null;
  /** Optional icon key resolved in the UI. */
  icon: string | null;
  /** Verified official website, or null until confirmed. */
  officialWebsite: string | null;
  /** Verified contact channel, or null until confirmed. */
  contact: string | null;
  mission: string;
  areasOfInterest: string[];
  achievements: string[];
  activities: string[];
  createdAt: string;
  updatedAt: string;
}

// ----------------------------- Root DB ------------------------------------

export interface ResetToken {
  email: string;
  token: string;
  expiresAt: string;
  used: boolean;
}

export interface Database {
  version: number;
  users: User[];
  sessions: Session[];
  resets: ResetToken[];
  communities: Community[];
  communityMembers: CommunityMember[];
  posts: Post[];
  comments: Comment[];
  votes: Vote[];
  reports: Report[];
  events: CampusEvent[];
  societies: Society[];
  societyMembers: SocietyMember[];
  registrations: Registration[];
  notifications: AppNotification[];
  reads: ReadMarker[];
  syllabus: SyllabusSubject[];
  scholarships: Scholarship[];
  attendance: AttendanceRecord[];
  timetables: Timetable[];
  materials: Material[];
  exams: Exam[];
}
