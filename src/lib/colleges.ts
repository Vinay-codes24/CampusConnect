import { UNIVERSITIES, type UniversityId } from "./universities";

/**
 * The four CampusConnect college communities (Posts feed, Reddit-style).
 *
 * Name and short name come from the shared university list so the college
 * picker and the feed can never drift apart; descriptions and colour tokens
 * live here because they are feed-specific presentation.
 */
export interface CollegeCommunity {
  id: UniversityId;
  shortName: string;
  name: string;
  /** One-line description shown in the community header. */
  description: string;
  /** Solid accent used for emblems, tags and active pills. */
  color: string;
  /** Very light tinted background for tags and active pills. */
  soft: string;
  /** Matching hairline border. */
  border: string;
  /** Banner gradient for the community header. */
  gradient: string;
}

const DESCRIPTIONS: Record<UniversityId, string> = {
  dtu: "Campus life, questions and resources shared by Delhi Technological University students.",
  igdtuw:
    "Discussion, questions and resources from the Indira Gandhi Delhi Technical University for Women community.",
  nsut:
    "Questions, campus chatter and study help from the Netaji Subhas University of Technology community.",
  iiitd:
    "Projects, coursework talk and campus life from the Indraprastha Institute of Information Technology Delhi community.",
};

/** Same palette as the college picker cards so identity stays consistent. */
const ACCENTS: Record<
  UniversityId,
  { color: string; soft: string; border: string; gradient: string }
> = {
  dtu: {
    color: "#1d4ed8",
    soft: "#eff6ff",
    border: "rgba(37, 99, 235, 0.35)",
    gradient: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
  },
  igdtuw: {
    color: "#be185d",
    soft: "#fdf2f8",
    border: "rgba(190, 24, 93, 0.35)",
    gradient: "linear-gradient(135deg, #be185d, #f472b6)",
  },
  nsut: {
    color: "#047857",
    soft: "#ecfdf5",
    border: "rgba(4, 120, 87, 0.35)",
    gradient: "linear-gradient(135deg, #047857, #34d399)",
  },
  iiitd: {
    color: "#6d28d9",
    soft: "#f5f3ff",
    border: "rgba(124, 58, 237, 0.35)",
    gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)",
  },
};

export const COLLEGE_COMMUNITIES: CollegeCommunity[] = UNIVERSITIES.map((u) => ({
  id: u.id,
  shortName: u.shortName,
  name: u.name,
  description: DESCRIPTIONS[u.id],
  ...ACCENTS[u.id],
}));

export function findCollege(id: string | null | undefined): CollegeCommunity | null {
  if (!id) return null;
  const normalized = id.trim().toLowerCase();
  return COLLEGE_COMMUNITIES.find((c) => c.id === normalized) ?? null;
}
