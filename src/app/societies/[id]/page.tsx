"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  Loader2,
  Mail,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { EmptyState, ErrorState } from "@/components/ui";
import { findUniversity } from "@/lib/universities";
import { SocietyIcon } from "@/components/societies/society-icon";
import { SocietyLogo } from "@/components/societies/society-logo";
import type { Society } from "@/lib/types";

export default function SocietyDetailPage() {
  const params = useParams<Record<string, string | string[]>>() ?? {};
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) {
    return (
      <div className="container">
        <ErrorState message="This society link is incomplete." />
      </div>
    );
  }
  return <SocietyDetail id={id} />;
}

function SocietyDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user, toast } = useApp();
  const [society, setSociety] = useState<Society | null>(null);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    api<{ society: Society; joined: boolean }>(`/api/societies/${id}`)
      .then((data) => {
        setSociety(data.society);
        setJoined(data.joined);
      })
      .catch((err: Error) => {
        if (/does not exist/i.test(err.message)) setNotFound(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleJoin() {
    if (!user) {
      router.push("/login");
      return;
    }
    setJoining(true);
    try {
      const data = await api<{ id: string; joined: boolean }>(`/api/societies/${id}/join`, {
        method: "POST",
        json: {},
      });
      setJoined(data.joined);
      toast(data.joined ? "Joined this society" : "Left this society", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setJoining(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="container stack" aria-hidden="true">
        <div className="skeleton" style={{ height: 22, width: 150 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 18 }} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="panel card-pad stack" style={{ gridColumn: "span 2" }}>
            <div className="skeleton" style={{ height: 20, width: "40%" }} />
            <div className="skeleton" style={{ height: 14, width: "100%" }} />
            <div className="skeleton" style={{ height: 14, width: "92%" }} />
            <div className="skeleton" style={{ height: 14, width: "70%" }} />
          </div>
          <div className="panel card-pad stack">
            <div className="skeleton" style={{ height: 18, width: "60%" }} />
            <div className="skeleton" style={{ height: 38, width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container">
        <EmptyState
          icon={<UsersRound size={26} />}
          title="Society not found"
          body="This society may not be registered yet, or the link is wrong."
          action={
            <Link href="/societies" className="btn btn-primary">
              <ArrowLeft size={16} aria-hidden="true" /> Explore societies
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !society) {
    return (
      <div className="container">
        <ErrorState message={error ?? "We could not load this society."} onRetry={load} />
      </div>
    );
  }

  const university = findUniversity(society.collegeId);
  const accentColor = university?.id === "dtu" ? "#1d4ed8" : university?.id === "igdtuw" ? "#be185d" : university?.id === "nsut" ? "#047857" : "#6d28d9";

  return (
    <div className="container stack">
      <Link href="/societies" className="link row" style={{ width: "fit-content", fontSize: 14 }}>
        <ArrowLeft size={16} aria-hidden="true" /> All societies
      </Link>

      <div className="panel" style={{ position: "relative", overflow: "hidden" }}>
        <div
          aria-hidden="true"
          style={{
            width: "100%",
            height: "clamp(160px, 24vw, 220px)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1 }}>
              {society.logo ? (
                /* White tile keeps the real logo readable over the gradient and
                   never crops it (object-fit: contain, handled in CSS). */
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 104,
                    height: 104,
                    margin: "0 auto",
                    padding: 10,
                    borderRadius: 24,
                    background: "#fff",
                    boxShadow: "0 12px 28px -12px rgba(15, 23, 42, 0.55)",
                  }}
                >
                  <SocietyLogo src={society.logo} icon={society.icon} size={84} />
                </span>
              ) : society.icon ? (
                <span style={{ display: "inline-grid", placeItems: "center" }}>
                  <SocietyIcon icon={society.icon} size={64} />
                </span>
              ) : (
                <span>{(society.name || "?").trim().slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 34px)", marginBottom: 0 }}>{society.name}</h1>
          <p className="text-sm muted" style={{ margin: 0 }}>
            {university?.name ?? "Campus society"} • {society.category}
          </p>
          {society.tagline ? <p style={{ margin: 0, fontSize: 15, color: "var(--color-ink-700)" }}>{society.tagline}</p> : null}
        </div>
        <span
          className="tag"
          style={{ background: "rgba(124,58,237,0.10)", color: accentColor, borderColor: "transparent" }}
        >
          {society.category}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ alignItems: "start" }}>
        <div className="stack lg:col-span-2">
          <section className="card card-pad stack" aria-labelledby="soc-about">
            <h2 id="soc-about" style={{ fontSize: 17 }}>About</h2>
            <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: 15, lineHeight: 1.7 }}>
              {society.fullDescription || society.shortDescription || "No verified description has been added for this society yet."}
            </p>
          </section>

          <section className="card card-pad stack" aria-labelledby="soc-mission">
            <h2 id="soc-mission" style={{ fontSize: 17, display: "flex", gap: 8, alignItems: "center" }}>
              <Target size={17} style={{ color: "var(--color-accent-600)" }} aria-hidden="true" /> Mission & activities
            </h2>
            {society.mission ? (
              <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: 14.5 }}>{society.mission}</p>
            ) : (
              <p className="text-sm muted" style={{ margin: 0 }}>No verified mission has been recorded yet.</p>
            )}
            {society.areasOfInterest.length > 0 ? (
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {society.areasOfInterest.map((item) => (
                  <span key={item} className="tag">{item}</span>
                ))}
              </div>
            ) : null}
            {society.activities.length > 0 ? (
              <ul className="stack" style={{ gap: 6, listStyle: "none", margin: 0, padding: 0 }}>
                {society.activities.map((item) => (
                  <li key={item} className="row" style={{ alignItems: "flex-start", gap: 8 }}>
                    <span aria-hidden="true" style={{ color: accentColor, marginTop: 2, flex: "none" }}>
                      <Sparkles size={14} />
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm muted" style={{ margin: 0 }}>No verified activities have been recorded yet.</p>
            )}
          </section>

          <section className="card card-pad stack" aria-labelledby="soc-achievements">
            <h2 id="soc-achievements" style={{ fontSize: 17 }}>Achievements</h2>
            {society.achievements.length > 0 ? (
              <ul className="stack" style={{ gap: 6, listStyle: "none", margin: 0, padding: 0 }}>
                {society.achievements.map((item) => (
                  <li key={item} className="row" style={{ alignItems: "flex-start", gap: 8 }}>
                    <span aria-hidden="true" style={{ color: "var(--color-brand-600)", marginTop: 2, flex: "none" }}>★</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<UsersRound size={20} />}
                title="No verified achievements yet"
                body="Achievements appear here only when verified information is available. Please check back once records are added."
              />
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="card card-pad stack" aria-labelledby="soc-college">
            <h2 id="soc-college" style={{ fontSize: 16 }}>College</h2>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <Building2 size={17} aria-hidden="true" style={{ color: accentColor, flex: "none" }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{university?.name ?? society.collegeId}</div>
                <div className="text-sm muted">{university?.shortName ?? society.collegeId.toUpperCase()}</div>
              </div>
            </div>
          </section>

          <section className="card card-pad stack" aria-labelledby="soc-membership">
            <h2 id="soc-membership" style={{ fontSize: 16 }}>Membership</h2>
            <p className="text-sm muted" style={{ margin: 0 }}>
              Membership is saved to your account. Joining a society is not proof of college enrolment.
            </p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {user ? (
                <button
                  type="button"
                  className={`btn ${joined ? "btn-soft" : "btn-primary"} btn-sm`}
                  onClick={toggleJoin}
                  disabled={joining}
                  aria-pressed={joined}
                >
                  {joining ? <Loader2 size={14} className="animate-spin" /> : joined ? "Leave Society" : "Join Society"}
                </button>
              ) : (
                <Link href="/login" className="btn btn-primary btn-sm">
                  Sign in to join
                </Link>
              )}
            </div>
            {user ? (
              <p className="text-sm muted" style={{ margin: 0 }}>
                {joined ? "You have joined this society." : "Join to see it under Joined Societies."}
              </p>
            ) : null}
          </section>

          {(society.officialWebsite || society.contact) ? (
            <section className="card card-pad stack" aria-labelledby="soc-contact">
              <h2 id="soc-contact" style={{ fontSize: 16 }}>Verified links</h2>
              <div className="stack" style={{ gap: 8 }}>
                {society.officialWebsite ? (
                  <a className="btn btn-soft btn-sm" href={society.officialWebsite} target="_blank" rel="noopener noreferrer" style={{ width: "100%" }}>
                    <Globe size={15} aria-hidden="true" /> Website
                  </a>
                ) : null}
                {society.contact ? (
                  <a className="btn btn-soft btn-sm" href={`mailto:${society.contact}`} style={{ width: "100%" }}>
                    <Mail size={15} aria-hidden="true" /> Contact
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
