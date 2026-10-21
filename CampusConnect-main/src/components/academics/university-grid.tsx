"use client";

import { UNIVERSITIES } from "@/lib/universities";
import { UniversityCard } from "./university-card";

interface UniversityGridProps {
  onSelect: (id: string) => void;
}

export function UniversityGrid({ onSelect }: UniversityGridProps) {
  return (
    <div className="university-grid">
      <div className="university-grid-header">
        <h1>Choose Your University</h1>
        <p>Your academic life, all in one place.</p>
      </div>
      <div className="university-grid-cards">
        {UNIVERSITIES.map((u) => (
          <UniversityCard key={u.id} university={u} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}