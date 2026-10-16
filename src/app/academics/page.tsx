"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { findUniversity, readStoredUniversity, writeStoredUniversity, clearStoredUniversity } from "@/lib/universities";
import { api } from "@/lib/client";
import { UniversityGrid } from "@/components/academics/university-grid";
import { featureCards } from "@/components/academics/feature-cards";
import { FeatureGrid } from "@/components/academics/feature-grid";

export default function AcademicsPage() {
  const { user, refreshUser } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user?.university) {
      setSelectedId(user.university);
    } else {
      setSelectedId(readStoredUniversity());
    }
    setInitialized(true);
  }, [user?.university]);

  const current = findUniversity(selectedId);

  async function handleSelect(id: string) {
    const uni = findUniversity(id)!;
    writeStoredUniversity(uni.id);
    setSelectedId(uni.id);
    if (user) {
      try {
        await api("/api/auth/me", { method: "PATCH", json: { university: uni.id } });
        await refreshUser();
      } catch {
        // Keep localStorage selection even if the server call fails.
      }
    }
  }

  async function handleChange() {
    clearStoredUniversity();
    setSelectedId(null);
    if (user) {
      try {
        await api("/api/auth/me", { method: "PATCH", json: { university: null } });
        await refreshUser();
      } catch {
        // ignore; preference will re-sync on next change
      }
    }
  }

  if (!initialized) {
    return (
      <div className="container stack">
        <div className="card card-pad">Loading academic preferences…</div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="container stack">
        <UniversityGrid onSelect={handleSelect} />
      </div>
    );
  }

  return (
    <div className="container stack">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        <div>
          <p className="text-xs" style={{ fontWeight: 700, color: "var(--color-brand-600)", marginBottom: 4 }}>
            {current.shortName} · {current.location}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>{current.name}</h1>
          <p className="text-sm muted">Academic dashboard for your selected campus.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleChange}>
          Change University
        </button>
      </div>

      <FeatureGrid features={featureCards(current.id)} />

      <div className="card card-pad" style={{ borderStyle: "dashed" }}>
        <p className="text-sm muted" style={{ lineHeight: 1.6 }}>
          Each university keeps its own academic data and integrations. Timetable, subjects and academic dates use the
          shared CampusConnect data layer, while attendance sync is enabled per university. Holidays and any unverified
          academic dates stay marked as not configured instead of being invented. Changing your university only changes
          your preference — it never moves attendance or academic records between institutions.
        </p>
      </div>
    </div>
  );
}
