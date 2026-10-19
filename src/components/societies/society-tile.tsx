import Link from "next/link";
import type { CSSProperties } from "react";
import type { Society } from "@/lib/types";
import { SocietyLogo } from "@/components/societies/society-logo";

/** Society record plus the viewer's join state (as returned by the API). */
export type SocietyTileData = Society & { joined?: boolean };

type Tone = { stage: string; stageHover: string; label: string };

/**
 * One calm, desaturated stage tint per directory group. The tones stay in the
 * same purple / blue / teal family as the rest of CampusConnect but are muted
 * enough that the society's own artwork remains the hero of the card. Unknown
 * (future) categories fall back to the indigo tone.
 */
const CATEGORY_TONES: Record<string, Tone> = {
  "Recreational Clubs": { stage: "#f4f1fb", stageHover: "#ebe4f8", label: "#6d4ab5" },
  "Technical Societies": { stage: "#eef7f5", stageHover: "#e1f1ec", label: "#0f766e" },
  "Non-Technical Societies": { stage: "#eef2fd", stageHover: "#e3ebfb", label: "#3f56c4" },
  "Literary Clubs": { stage: "#f1f4fb", stageHover: "#e5ecf9", label: "#2f55b8" },
  "Automotive Clubs": { stage: "#eff6f8", stageHover: "#e2f0f4", label: "#155e75" },
  "Community Service Initiatives": { stage: "#f0f8f6", stageHover: "#e3f2ed", label: "#0f766e" },
};

const DEFAULT_TONE: Tone = CATEGORY_TONES["Non-Technical Societies"];

function toneFor(category: string): Tone {
  return CATEGORY_TONES[category] ?? DEFAULT_TONE;
}

function toneVars(tone: Tone): CSSProperties {
  return {
    "--stage": tone.stage,
    "--stage-hover": tone.stageHover,
    "--tone": tone.label,
  } as CSSProperties;
}

/**
 * Product-showcase society tile: a large, softly tinted stage carries the
 * society's real logo as the hero, with the name and an understated category
 * label beneath it. Everything else (descriptions, statistics, badges,
 * "view details" chrome) is deliberately left off — the selector, category
 * chips and search already carry that context.
 *
 * The whole tile is a single link to the existing society detail route
 * (`/societies/[id]`), so it works with both pointer and keyboard without any
 * extra button markup.
 */
export function SocietyTile({ society }: { society: SocietyTileData }) {
  return (
    <Link
      href={`/societies/${society.id}`}
      className="society-tile"
      style={toneVars(toneFor(society.category))}
      aria-label={`Open ${society.name}`}
    >
      {/* The stage is decorative: the accessible name comes from the link
          label and the visible heading below, so screen readers are not read
          the logo twice. */}
      <span className="society-tile__stage" aria-hidden="true">
        <SocietyLogo src={society.logo} icon={society.icon} fill />
      </span>

      <span className="society-tile__meta">
        <h2 className="society-tile__name">{society.name}</h2>
        <span className="society-tile__category">{society.category}</span>
      </span>
    </Link>
  );
}
