"use client";

import { UNIVERSITIES } from "@/lib/universities";

interface UniversityCardProps {
  university: (typeof UNIVERSITIES)[number];
  onSelect: (id: string) => void;
}

const accents: Record<string, { emblem: string; soft: string; border: string }> = {
  dtu: { emblem: "linear-gradient(145deg, #1e3a8a, #3b82f6)", soft: "rgba(30,58,138,0.06)", border: "rgba(30,58,138,0.16)" },
  igdtuw: { emblem: "linear-gradient(145deg, #be185d, #f472b6)", soft: "rgba(190,24,93,0.06)", border: "rgba(190,24,93,0.16)" },
  nsut: { emblem: "linear-gradient(145deg, #047857, #34d399)", soft: "rgba(4,120,87,0.06)", border: "rgba(4,120,87,0.16)" },
  iiitd: { emblem: "linear-gradient(145deg, #7c3aed, #a78bfa)", soft: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.16)" },
};

export function UniversityCard({ university, onSelect }: UniversityCardProps) {
  const accent = accents[university.id];

  return (
    <button
      type="button"
      onClick={() => onSelect(university.id)}
      aria-label={`Select ${university.name}`}
      className="university-card"
      style={{
        "--emblem": accent.emblem,
        "--soft": accent.soft,
        "--border": accent.border,
      } as React.CSSProperties}
    >
      <span aria-hidden="true" className="university-emblem">
        {university.shortName}
      </span>
      <span className="university-short-name">{university.shortName}</span>
      <span className="university-name">{university.name}</span>
    </button>
  );
}