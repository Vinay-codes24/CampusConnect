"use client";

import { UNIVERSITIES } from "@/lib/universities";

interface UniversityCardProps {
  university: (typeof UNIVERSITIES)[number];
  onSelect: (id: string) => void;
}

const accents: Record<string, { logo: string; soft: string; border: string }> = {
  dtu: { logo: "/logos/dtu.png", soft: "rgba(30,58,138,0.06)", border: "rgba(30,58,138,0.16)" },
  igdtuw: { logo: "/logos/igdtuw.png", soft: "rgba(190,24,93,0.06)", border: "rgba(190,24,93,0.16)" },
  nsut: { logo: "/logos/nsut.png", soft: "rgba(4,120,87,0.06)", border: "rgba(4,120,87,0.16)" },
  iiitd: { logo: "/logos/iiitd.png", soft: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.16)" },
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
        "--soft": accent.soft,
        "--border": accent.border,
      } as React.CSSProperties}
    >
      <span aria-hidden="true" className="university-emblem">
        <img src={accent.logo} alt="" />
      </span>
      <span className="university-short-name">{university.shortName}</span>
      <span className="university-name">{university.name}</span>
    </button>
  );
}