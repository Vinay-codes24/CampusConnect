"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import {
  Atom,
  BookOpen,
  Building2,
  CircuitBoard,
  Cpu,
  Dna,
  Factory,
  FlaskConical,
  Layers,
  Leaf,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import type { StudySubject } from "@/lib/types";

export type LibrarySubject = StudySubject & { fileCount: number; totalSize: number };

/**
 * Picks a sensible icon for a subject from its name, so the folder grid reads
 * at a glance. Deliberately keyword-based and side-effect free.
 */
export function subjectIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/(math|algebra|calculus|numerical|discrete|linear|statistic|probabilit|geometry|trigono)/.test(n)) return Sigma;
  if (/(chem|polymer|organic|inorganic|electrochem)/.test(n)) return FlaskConical;
  if (/(biolog|bio-?tech|biotech|biochem|genetic|microbio)/.test(n)) return Dna;
  if (/(environ|ecolog|sustainab|climate)/.test(n)) return Leaf;
  if (/(civil|structural|geoinformat|survey|concrete|geotech|transport|hydrolog)/.test(n)) return Building2;
  if (/(manufactur|workshop|industrial|production|welding|machining|casting)/.test(n)) return Factory;
  if (/(material|metallurg|composite|ceramic)/.test(n)) return Layers;
  if (/(physic|mechanic|thermal|fluid|thermo|optic|wave|vibrat|machine design|kinematic|turbomachin|energy)/.test(n)) return Atom;
  if (/(circuit|electronic|electrical|analog|digital|signal|communicat|microprocessor|antenna|vlsi|power system|control)/.test(n)) return CircuitBoard;
  if (/(comput|program|software|algorithm|database|operating system|network|machine learning|artificial intelligence|deep learning|data struct|compiler|web|artificial intelligence|internet of things|blockchain|cloud)/.test(n)) return Cpu;
  return BookOpen;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="lib-crumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="lib-crumb">
          {i > 0 ? <ChevronRight size={14} aria-hidden="true" className="lib-crumb-sep" /> : null}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const SEM_SHORT: Record<string, string> = {
  "Semester 1": "Sem 1",
  "Semester 2": "Sem 2",
  "Semester 3": "Sem 3",
  "Semester 4": "Sem 4",
  "Semester 5": "Sem 5",
  "Semester 6": "Sem 6",
  "Semester 7": "Sem 7",
  "Semester 8": "Sem 8",
};

/** One vertical "folder" card in the library grid. The whole card is a link. */
export function FolderCard({ subject }: { subject: LibrarySubject }) {
  const Icon = subjectIcon(subject.name);
  const count = subject.fileCount;

  return (
    <Link href={`/academics/study-materials/${subject.id}`} className="lib-card">
      <span className="lib-card-tab" aria-hidden="true">
        {subject.code || "Folder"}
      </span>

      <span className="lib-card-icon" aria-hidden="true">
        <Icon size={26} strokeWidth={1.9} />
      </span>

      <div className="lib-card-body">
        <h3 className="lib-card-title">{subject.name}</h3>
        {subject.description ? <p className="lib-card-desc">{subject.description}</p> : null}
      </div>

      <div className="lib-card-foot">
        <span className="lib-card-count">
          <FileText size={14} aria-hidden="true" />
          {count} PDF{count === 1 ? "" : "s"}
        </span>
        {subject.semester ? <span className="lib-card-sem">{SEM_SHORT[subject.semester] ?? subject.semester}</span> : null}
      </div>
    </Link>
  );
}

export function shortSemester(semester: string): string {
  return SEM_SHORT[semester] ?? semester;
}
