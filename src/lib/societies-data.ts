import type { Society, SocietyCategory } from "./types";

/**
 * NSUT societies & clubs directory.
 *
 * Every entry below was transcribed from the NSUT societies listing provided
 * by the college. Only the names, groupings, icon keys, short factual
 * summaries and locally hosted logos are stored — members, contacts,
 * achievements, websites and social links are intentionally left empty rather
 * than invented.
 *
 * This file is pure data: it holds no UI code, so it can be maintained (or
 * extended with other colleges) without touching components. Icons are only
 * *keys* here; they are resolved to Lucide icons in
 * src/components/societies/society-icon.tsx. Logos are real files served from
 * public/ and referenced with web-root paths (never /public/...).
 */

/** Root folder (inside public/) holding the downloaded society logos. */
const LOGO_DIR = "/images/societies";

export interface SocietySeedRecord {
  /** Stable, unique id — used by detail routes and membership records. */
  id: string;
  /** Display name exactly as listed by the college (minor typography only). */
  name: string;
  category: SocietyCategory;
  /** Icon key resolved by the UI — also the fallback when no logo loads. */
  icon: string;
  /** One-line factual summary used on cards (often the listed subtitle). */
  shortDescription: string;
  /** Interest tags derived from the society's own name/category. */
  areasOfInterest: string[];
  /**
   * Path of the society's real logo inside public/, or null when the college
   * hasn't supplied one. Extensions match the actual files on disk.
   */
  logo: string | null;
}

export const NSUT_SOCIETY_SEEDS: readonly SocietySeedRecord[] = [
  // ---------------------------- Recreational clubs ------------------------
  {
    id: "nsut-ashwamedh",
    name: "Ashwamedh",
    category: "Recreational Clubs",
    icon: "drama",
    shortDescription: "The Dramatics Society",
    areasOfInterest: ["Drama", "Theatre", "Performance"],
    logo: `${LOGO_DIR}/ashwamedh.jpg`,
  },
  {
    id: "nsut-crescendo",
    name: "Crescendo",
    category: "Recreational Clubs",
    icon: "music",
    shortDescription: "The Music Society",
    areasOfInterest: ["Music", "Performance"],
    logo: `${LOGO_DIR}/crescendo.jpg`,
  },
  {
    id: "nsut-junoon",
    name: "Junoon",
    category: "Recreational Clubs",
    icon: "camera",
    shortDescription: "The Photography Club",
    areasOfInterest: ["Photography"],
    logo: `${LOGO_DIR}/junoon.png`,
  },
  {
    id: "nsut-canvas",
    name: "Canvas NSUT",
    category: "Recreational Clubs",
    icon: "art",
    shortDescription: "Art and design society at NSUT",
    areasOfInterest: ["Art", "Design"],
    logo: `${LOGO_DIR}/canvasnsut.png`,
  },
  {
    id: "nsut-mirage",
    name: "Mirage",
    category: "Recreational Clubs",
    icon: "dance",
    shortDescription: "The Western Dance Crew",
    areasOfInterest: ["Western Dance", "Dance"],
    logo: null,
  },
  {
    id: "nsut-choreography",
    name: "Choreography Society",
    category: "Recreational Clubs",
    icon: "choreography",
    shortDescription: "Choreography society at NSUT",
    areasOfInterest: ["Choreography", "Dance"],
    logo: null,
  },
  {
    id: "nsut-spic-macay",
    name: "Spic Macay",
    category: "Recreational Clubs",
    icon: "culture",
    shortDescription: "NSUT Chapter",
    areasOfInterest: ["Culture", "Arts"],
    logo: null,
  },

  // ---------------------------- Technical societies -----------------------
  {
    id: "nsut-csi",
    name: "CSI NSUT",
    category: "Technical Societies",
    icon: "cpu",
    shortDescription: "CSI student chapter at NSUT",
    areasOfInterest: ["Technology", "Computing"],
    logo: null,
  },
  {
    id: "nsut-ieee",
    name: "IEEE NSUT",
    category: "Technical Societies",
    icon: "zap",
    shortDescription: "IEEE student chapter at NSUT",
    areasOfInterest: ["Engineering", "Technology"],
    logo: null,
  },
  {
    id: "nsut-asme",
    name: "ASME NSUT",
    category: "Technical Societies",
    icon: "cog",
    shortDescription: "ASME student chapter at NSUT",
    areasOfInterest: ["Mechanical Engineering", "Engineering"],
    logo: `${LOGO_DIR}/asmensut.jpg`,
  },
  {
    id: "nsut-kalpana",
    name: "Kalpana NSUT",
    category: "Technical Societies",
    icon: "telescope",
    shortDescription: "Astronomy and space society at NSUT",
    areasOfInterest: ["Astronomy", "Space"],
    logo: `${LOGO_DIR}/kalpanansut.jpg`,
  },
  {
    id: "nsut-gdsc",
    name: "GDSC NSUT",
    category: "Technical Societies",
    icon: "code",
    shortDescription: "Google Developer Student Club at NSUT",
    areasOfInterest: ["Development", "Technology"],
    logo: `${LOGO_DIR}/gdscnsut.png`,
  },
  {
    id: "nsut-control-delvers",
    name: "Control Delvers",
    category: "Technical Societies",
    icon: "terminal",
    shortDescription: "Technical society at NSUT",
    areasOfInterest: ["Coding", "Technology"],
    logo: null,
  },

  // ------------------------- Non-technical societies ----------------------
  {
    id: "nsut-enactus",
    name: "Enactus NSUT",
    category: "Non-Technical Societies",
    icon: "hand-heart",
    shortDescription: "Enactus chapter at NSUT",
    areasOfInterest: ["Entrepreneurship", "Social Impact"],
    logo: `${LOGO_DIR}/enactusnsut.jpg`,
  },
  {
    id: "nsut-finance-economics",
    name: "Finance & Economics Society",
    category: "Non-Technical Societies",
    icon: "finance",
    shortDescription: "Finance and economics society at NSUT",
    areasOfInterest: ["Finance", "Economics"],
    logo: null,
  },
  {
    id: "nsut-management-consulting",
    name: "The Management & Consulting Club",
    category: "Non-Technical Societies",
    icon: "management",
    shortDescription: "Management and consulting club at NSUT",
    areasOfInterest: ["Management", "Consulting"],
    logo: null,
  },
  {
    id: "nsut-ecell",
    name: "E-Cell NSUT",
    category: "Non-Technical Societies",
    icon: "rocket",
    shortDescription: "Entrepreneurship cell at NSUT",
    areasOfInterest: ["Entrepreneurship", "Startups"],
    logo: `${LOGO_DIR}/ecellnsut.png`,
  },
  {
    id: "nsut-tedxnsit",
    name: "TEDxNSIT",
    category: "Non-Technical Societies",
    icon: "mic",
    shortDescription: "TEDx chapter at NSUT",
    areasOfInterest: ["Ideas", "Public Speaking"],
    logo: `${LOGO_DIR}/tedxnsit.png`,
  },

  // ------------------------------ Literary clubs --------------------------
  {
    id: "nsut-the-alliance",
    name: "The Alliance",
    category: "Literary Clubs",
    icon: "newspaper",
    shortDescription: "NSUT's Newspaper",
    areasOfInterest: ["Journalism", "Newspaper"],
    logo: `${LOGO_DIR}/thealliancensut.jpg`,
  },
  {
    id: "nsut-crosslinks",
    name: "Crosslinks",
    category: "Literary Clubs",
    icon: "media",
    shortDescription: "The Media Management Society",
    areasOfInterest: ["Media", "Management"],
    logo: `${LOGO_DIR}/crosslinksnsut.jpg`,
  },
  {
    id: "nsut-aagaaz",
    name: "Aagaaz NSUT",
    category: "Literary Clubs",
    icon: "poetry",
    shortDescription: "The Poetry Society of NSUT",
    areasOfInterest: ["Poetry", "Slam Poetry"],
    logo: `${LOGO_DIR}/aagaaznsut.jpg`,
  },
  {
    id: "nsut-debating",
    name: "Debating Society of NSUT",
    category: "Literary Clubs",
    icon: "debate",
    shortDescription: "Debating society at NSUT",
    areasOfInterest: ["Debate", "Public Speaking"],
    logo: null,
  },
  {
    id: "nsut-the-magzine",
    name: "The Magzine",
    category: "Literary Clubs",
    icon: "magazine",
    shortDescription: "Magazine club at NSUT",
    areasOfInterest: ["Magazine", "Writing"],
    logo: null,
  },
  {
    id: "nsut-quiz-club",
    name: "The NSUT Quiz Club",
    category: "Literary Clubs",
    icon: "quiz",
    shortDescription: "Quiz club at NSUT",
    areasOfInterest: ["Quizzes", "Trivia"],
    logo: null,
  },
  {
    id: "nsut-flashback",
    name: "Flashback",
    category: "Literary Clubs",
    icon: "yearbook",
    shortDescription: "The Yearbook Society",
    areasOfInterest: ["Yearbook"],
    logo: null,
  },
  {
    id: "nsut-page-turners",
    name: "The Page Turners",
    category: "Literary Clubs",
    icon: "reading",
    shortDescription: "Literary club at NSUT",
    areasOfInterest: ["Reading", "Books"],
    logo: null,
  },
  {
    id: "nsut-reminisce",
    name: "Reminisce",
    category: "Literary Clubs",
    icon: "alumni-magazine",
    shortDescription: "NSUT's Alumni Magazine",
    areasOfInterest: ["Alumni", "Magazine"],
    logo: null,
  },

  // ----------------------------- Automotive clubs -------------------------
  {
    id: "nsut-solar-car",
    name: "NSUT Solar Car Concept",
    category: "Automotive Clubs",
    icon: "solar",
    shortDescription: "NSUT's solar car concept",
    areasOfInterest: ["Solar", "Automotive"],
    logo: null,
  },
  {
    id: "nsut-bullet-hawk",
    name: "Bullet Hawk Racing",
    category: "Automotive Clubs",
    icon: "racing",
    shortDescription: "Racing club at NSUT",
    areasOfInterest: ["Racing", "Automotive"],
    logo: `${LOGO_DIR}/bullethawkracingnsut.jpg`,
  },
  {
    id: "nsut-tdr",
    name: "TDR NSUT",
    category: "Automotive Clubs",
    icon: "racing",
    shortDescription: "Team Daedalus Racing, NSUT's motorsport team",
    areasOfInterest: ["Motorsports", "Automotive"],
    logo: `${LOGO_DIR}/tdrnsut.jpg`,
  },
  {
    id: "nsut-motorsports",
    name: "NSUT Motorsports",
    category: "Automotive Clubs",
    icon: "motorsports",
    shortDescription: "Motorsports club at NSUT",
    areasOfInterest: ["Motorsports", "Automotive"],
    logo: null,
  },
  {
    id: "nsut-moon-buggy",
    name: "NSUT Moon Buggy",
    category: "Automotive Clubs",
    icon: "car",
    shortDescription: "Moon buggy project at NSUT",
    areasOfInterest: ["Automotive", "Engineering"],
    logo: null,
  },

  // ------------------------ Community service initiatives -----------------
  {
    id: "nsut-rotaract",
    name: "NSUT Rotaract Club",
    category: "Community Service Initiatives",
    icon: "service",
    shortDescription: "Rotaract club at NSUT",
    areasOfInterest: ["Community Service", "Volunteering"],
    logo: null,
  },
  {
    id: "nsut-neighborhood-project",
    name: "Neighborhood Project",
    category: "Community Service Initiatives",
    icon: "community",
    shortDescription: "Community service initiative at NSUT",
    areasOfInterest: ["Community Service"],
    logo: null,
  },
  {
    id: "nsut-teach-for-india",
    name: "Teach for India",
    category: "Community Service Initiatives",
    icon: "teaching",
    shortDescription: "NSUT Chapter",
    areasOfInterest: ["Education", "Teaching"],
    logo: null,
  },
];

/**
 * Builds full `Society` records from the seed directory. Records carry no
 * achievements, contacts or links until they are actually verified — those
 * fields stay empty so the detail page shows its honest "nothing recorded
 * yet" states instead of fabricated content.
 */
export function buildNsutSocieties(): Society[] {
  const timestamp = new Date().toISOString();
  return NSUT_SOCIETY_SEEDS.map((seed) => ({
    id: seed.id,
    collegeId: "nsut" as const,
    name: seed.name,
    category: seed.category,
    shortDescription: seed.shortDescription,
    fullDescription: "",
    tagline: null,
    logo: seed.logo,
    icon: seed.icon,
    officialWebsite: null,
    contact: null,
    mission: "",
    areasOfInterest: [...seed.areasOfInterest],
    achievements: [],
    activities: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}
