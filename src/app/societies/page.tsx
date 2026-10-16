"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookmarkCheck,
  GraduationCap,
  LayoutGrid,
  Search as SearchIcon,
  UsersRound,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { findUniversity } from "@/lib/universities";
import type { Society } from "@/lib/types";

const UNIVERSITY_IDS = ["dtu", "igdtuw", "nsut", "iiitd"] as const;
type CollegeFilter = (typeof UNIVERSITY_IDS)[number] | "all";
type Selection = CollegeFilter | "joined";

type SocietyEntry = Society & { joined: boolean };

const COLLEGE_ACCENTS: Record<string, { color: string; soft: string; border: string }> = {
  all: { color: "#7c3aed", soft: "#f5f3ff", border: "rgba(124, 58, 237, 0.35)" },
  dtu: { color: "#1d4ed8", soft: "#eff6ff", border: "rgba(37, 99, 235, 0.35)" },
  igdtuw: { color: "#be185d", soft: "#fdf2f8", border: "rgba(190, 24, 93, 0.35)" },
  nsut: { color: "#047857", soft: "#ecfdf5", border: "rgba(4, 120, 87, 0.35)" },
  iiitd: { color: "#6d28d9", soft: "#f5f3ff", border: "rgba(124, 58, 237, 0.35)" },
  joined: { color: "#0f766e", soft: "#f0fdfa", border: "rgba(15, 118, 110, 0.35)" },
};

function SocietiesBrowser() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const joined = searchParams.get("joined") === "true";
  const college = parseCollegeFilter(searchParams.get("college"));
  const category = (searchParams.get("category") ?? "").trim();
  const q = (searchParams.get("q") ?? "").trim();
  const selection: Selection = joined ? "joined" : college;

  const [query, setQuery] = useState(q);
  const pushedQ = useRef(q);
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;

  const [societies, setSocieties] = useState<SocietyEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [allCount, setAllCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Count for the header/total stays aligned with the real dataset.
  useEffect(() => {
    api<{ societies: SocietyEntry[]; total: number }>("/api/societies")
      .then((data) => setAllCount(data.total))
      .catch(() => setAllCount(0));
  }, []);

  useEffect(() => {
    if (query.trim() === q) return;
    const id = window.setTimeout(() => {
      pushedQ.current = query.trim();
      const next = new URLSearchParams(paramsRef.current.toString());
      const nextQuery = query.trim();
      if (nextQuery) next.set("q", nextQuery);
      else next.delete("q");
      router.replace(`/societies${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
    }, 300);
    return () => window.clearTimeout(id);
  }, [query, q, router]);

  useEffect(() => {
    if (q !== pushedQ.current) {
      pushedQ.current = q;
      setQuery(q);
    }
  }, [q]);

  const buildUrl = useCallback(
    (patch: { joined?: boolean; college?: CollegeFilter; category?: string; q?: string }) => {
      const next = new URLSearchParams(searchParams.toString());
      const nextJoined = patch.joined !== undefined ? patch.joined : joined;
      const nextCollege = patch.college !== undefined ? patch.college : college;
      const nextCategory = patch.category !== undefined ? patch.category : category;
      const nextQuery = patch.q !== undefined ? patch.q : q;

      if (nextJoined) next.set("joined", "true");
      else next.delete("joined");
      if (nextCollege !== "all") next.set("college", nextCollege);
      else next.delete("college");
      if (nextCategory) next.set("category", nextCategory);
      else next.delete("category");
      if (nextQuery) next.set("q", nextQuery);
      else next.delete("q");

      const s = next.toString();
      return s ? `?${s}` : "";
    },
    [joined, college, category, q, searchParams],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (joined) params.set("joined", "true");
    if (college !== "all") params.set("college", college);
    if (category) params.set("category", category);
    if (q) params.set("q", q);

    api<{ societies: SocietyEntry[]; total: number }>(
      `/api/societies${params.toString() ? `?${params.toString()}` : ""}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setSocieties(data.societies);
        setTotal(data.total);
        // Categories follow the complete verified dataset, not the current filter.
        api<{ societies: SocietyEntry[] }>("/api/societies")
          .then((allData) => {
            setCategories(Array.from(new Set(allData.societies.map((s) => s.category))).sort());
          })
          .catch(() => {
            setCategories(Array.from(new Set(data.societies.map((s) => s.category))).sort());
          });
      })
      .catch((err: Error) => {
        if (controller.signal.aborted || err.name === "AbortError") return;
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [joined, college, category, q]);

  const reset = () => {
    setQuery("");
    pushedQ.current = "";
    router.replace("/societies", { scroll: false });
  };

  const emptyAsJoined = joined && !loading && !error && societies.length === 0;
  const filteredEmpty = !joined && !loading && !error && societies.length === 0 && (!!college && college !== "all" || !!category || !!q);

  const emptyTitle = emptyAsJoined
    ? "No societies joined yet"
    : filteredEmpty
    ? "No societies match"
    : "No societies available yet";
  const emptyBody = emptyAsJoined
    ? "Explore societies across DTU, IGDTUW, NSUT, and IIIT-Delhi to find your community."
    : filteredEmpty
    ? "Adjust the college, category or search, or reset the filters."
    : "No verified society records have been added yet. Societies appear here once their details have been verified.";

  const displayCount = joined ? total : allCount ?? 0;

  const buttonList: { id: Selection; label: string; icon: React.ElementType; vars: React.CSSProperties }[] = [
    {
      id: "all",
      label: "All Colleges",
      icon: LayoutGrid,
      vars: {
        "--pc": COLLEGE_ACCENTS.all.color,
        "--pc-soft": COLLEGE_ACCENTS.all.soft,
        "--pc-border": COLLEGE_ACCENTS.all.border,
      } as React.CSSProperties,
    },
    ...UNIVERSITY_IDS.map((id) => {
      const university = findUniversity(id);
      const accent = COLLEGE_ACCENTS[id];
      return {
        id,
        label: university?.shortName ?? id.toUpperCase(),
        icon: GraduationCap,
        vars: {
          "--pc": accent.color,
          "--pc-soft": accent.soft,
          "--pc-border": accent.border,
        } as React.CSSProperties,
      };
    }),
    {
      id: "joined",
      label: "Joined Societies",
      icon: BookmarkCheck,
      vars: {
        "--pc": COLLEGE_ACCENTS.joined.color,
        "--pc-soft": COLLEGE_ACCENTS.joined.soft,
        "--pc-border": COLLEGE_ACCENTS.joined.border,
      } as React.CSSProperties,
    },
  ];

  return (
    <div className="container stack" style={{ gap: 22 }}>
      <div className="panel card-pad">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
            <div
              aria-hidden="true"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                background: "linear-gradient(135deg, var(--color-brand-600), var(--color-accent-600))",
                boxShadow: "0 6px 16px -6px var(--color-brand-600)",
                flex: "none",
              }}
            >
              <UsersRound size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, lineHeight: 1.2 }}>Explore Societies</h1>
              <p className="text-sm muted" style={{ marginTop: 2 }}>
                Discover clubs, communities, and student organizations across Delhi colleges.
              </p>
            </div>
          </div>
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <span className="text-sm muted" aria-live="polite">
              {loading ? "Loading societies…" : `${displayCount} ${displayCount === 1 ? "society" : "societies"}`}
            </span>
          </div>
        </div>
      </div>

      <div className="panel card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <nav className="college-bar" aria-label="Society communities">
          {buttonList.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="college-pill"
                data-active={selection === item.id}
                aria-current={selection === item.id ? "page" : undefined}
                style={item.vars}
                onClick={() => {
                  if (item.id === "joined") {
                    router.replace(`/societies${buildUrl({ joined: true, college: "all" })}`, { scroll: false });
                  } else if (item.id === "all") {
                    router.replace(`/societies${buildUrl({ joined: false, college: "all" })}`, { scroll: false });
                  } else {
                    router.replace(`/societies${buildUrl({ joined, college: item.id })}`, { scroll: false });
                  }
                }}
              >
                <span className="college-emblem" aria-hidden="true">
                  <Icon size={16} />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()} aria-label="Search societies" style={{ maxWidth: "100%" }}>
          <SearchIcon size={17} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search societies by name, category, or interest…"
            aria-label="Search societies"
          />
          {query ? (
            <button
              type="button"
              className="icon-btn"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                pushedQ.current = "";
                router.replace(`/societies${buildUrl({ q: "" })}`, { scroll: false });
              }}
              style={{ position: "absolute", right: 3, top: 3, width: 34, height: 34 }}
            >
              <X size={16} />
            </button>
          ) : null}
        </form>

        {categories.length > 0 ? (
          <div className="chip-row" role="group" aria-label="Filter societies by category">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className="chip"
                aria-pressed={category === cat}
                onClick={() => router.replace(`/societies${buildUrl({ category: category === cat ? "" : cat })}`, { scroll: false })}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : null}

        {(joined || college !== "all" || category || q) ? (
          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="text-sm muted">
              Showing {total} {total === 1 ? "society" : "societies"}
              {joined ? " joined" : ""}
              {college !== "all" ? ` · ${findUniversity(college)?.shortName}` : ""}
              {category ? ` · ${category}` : ""}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
              <X size={14} aria-hidden="true" /> Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => router.refresh()} />
      ) : societies.length === 0 ? (
        <EmptyState
          icon={<UsersRound size={26} />}
          title={emptyTitle}
          body={emptyBody}
          action={
            emptyAsJoined ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.replace("/societies", { scroll: false })}
              >
                Explore Societies
              </button>
            ) : joined || college !== "all" || category || q ? (
              <button type="button" className="btn btn-primary" onClick={reset}>
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ alignItems: "stretch" }}>
          {societies.map((society) => {
            const university = findUniversity(society.collegeId);
            return (
              <article
                key={society.id}
                className="panel card-pad"
                style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 260 }}
              >
                <div className="row" style={{ justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <div
                    aria-hidden="true"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      background: `linear-gradient(135deg, ${COLLEGE_ACCENTS[society.collegeId]?.color ?? "#7c3aed"}, ${
                        COLLEGE_ACCENTS[society.collegeId]?.color ?? "#7c3aed"
                      }aa)`,
                      fontWeight: 800,
                      fontSize: 17,
                      flex: "none",
                      boxShadow: "0 8px 18px -8px rgba(15,23,42,0.25)",
                    }}
                  >
                    {(society.name || "?").trim().slice(0, 2).toUpperCase()}
                  </div>
                  <span className="tag" style={{ alignSelf: "flex-start" }}>
                    {university?.shortName ?? society.collegeId.toUpperCase()}
                  </span>
                </div>

                <div className="stack" style={{ gap: 6, flex: 1 }}>
                  <h2 style={{ fontSize: 18, lineHeight: 1.25 }}>{society.name}</h2>
                  <span className="tag" style={{ alignSelf: "flex-start" }}>
                    {society.category}
                  </span>
                  <p className="text-sm" style={{ margin: 0, color: "var(--color-ink-600)" }}>
                    {society.shortDescription || "A verified society record with no summary yet."}
                  </p>
                </div>

                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <a href={`/societies/${society.id}`} className="btn btn-primary btn-sm">
                    View Details
                  </a>
                  {society.joined ? <span className="tag">Joined</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function parseCollegeFilter(raw: string | null): CollegeFilter {
  return raw && (UNIVERSITY_IDS as readonly string[]).includes(raw) ? (raw as CollegeFilter) : "all";
}

export default function SocietiesPage() {
  return (
    <Suspense
      fallback={
        <div className="container stack" aria-hidden="true">
          <div className="skeleton" style={{ height: 34, width: 240 }} />
          <div className="skeleton" style={{ height: 44, maxWidth: 460 }} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      }
    >
      <SocietiesBrowser />
    </Suspense>
  );
}

