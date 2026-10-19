import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  Brain,
  Briefcase,
  Camera,
  Car,
  Code,
  Cog,
  Cpu,
  Drama,
  Feather,
  Flag,
  Footprints,
  HandHeart,
  HeartHandshake,
  Images,
  Library,
  Megaphone,
  MessageSquare,
  Mic,
  Music,
  Newspaper,
  Palette,
  PersonStanding,
  Rocket,
  School,
  Sparkles,
  Sun,
  Telescope,
  Terminal,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";

/**
 * Icon keys (stored in the society data) mapped to Lucide icons. Keeping this
 * map in the UI layer means the data file stays free of presentation code.
 * Unknown keys fall back to a neutral sparkle rather than breaking the card.
 */
const SOCIETY_ICONS: Record<string, LucideIcon> = {
  // Recreational
  drama: Drama,
  music: Music,
  camera: Camera,
  dance: PersonStanding,
  choreography: Footprints,
  culture: Palette,
  art: Palette,
  // Technical
  cpu: Cpu,
  zap: Zap,
  terminal: Terminal,
  cog: Cog,
  telescope: Telescope,
  code: Code,
  // Non-technical
  "hand-heart": HandHeart,
  finance: TrendingUp,
  management: Briefcase,
  rocket: Rocket,
  mic: Mic,
  // Literary
  newspaper: Newspaper,
  media: Megaphone,
  debate: MessageSquare,
  magazine: BookMarked,
  quiz: Brain,
  yearbook: Images,
  reading: Library,
  "alumni-magazine": Feather,
  poetry: Feather,
  // Automotive
  solar: Sun,
  racing: Flag,
  motorsports: Cog,
  car: Car,
  // Community service
  service: HeartHandshake,
  community: UsersRound,
  teaching: School,
};

export type SocietyIconProps = {
  /** Icon key stored on the society record (e.g. "drama"). */
  icon?: string | null;
  /** Pixel size of the glyph. */
  size?: number;
  className?: string;
};

/** Renders a society's Lucide icon. Decorative by default (aria-hidden). */
export function SocietyIcon({ icon, size = 24, className }: SocietyIconProps) {
  const Icon = (icon ? SOCIETY_ICONS[icon] : undefined) ?? Sparkles;
  return <Icon size={size} className={className} aria-hidden="true" focusable="false" />;
}
