"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, SearchX, Users } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";

type Hit = { type: string; title: string; subtitle: string; href: string };

const GROUP_ORDER = ["Post", "Event", "Student", "Resource", "Subject", "Announcement", "Scholarship", "Exam"];

const SUGGESTIONS = ["hackathon", "workshop", "syllabus", "exam schedule", "attendance", "scholarship"];

function SearchInner() {
  const { user } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const [input, setInput] = useState(q);
  const [results, setResults] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestSeq = useRef(0);

  // Keep the box in sync when the URL changes (back/forward, header search).
  useEffect(() => {
    setInput(q);
  }, [q]);

  const load = useCallback(async () => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      setError("");
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setError("");
    try {
      const res = await api<{ results: Hit[]; total: number }>(`/api/search?q=${encodeURIComponent(query)}&limit=30`);
      if (seq !== requestSeq.current) return;
      setResults(res.results);
      setTotal(res.total);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError((e as Error).message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [q]);

  // Debounced URL replacement so typing updates ?q= without spamming history.
  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === q.trim()) return;
    const id = window.setTimeout(() => {
      router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
    }, 350);
    return () => window.clearTimeout(id);
  }, [input, q, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  function useSuggestion(term: string) {
    setInput(term);
    router.replace(`/search?q=${encodeURIComponent(term)}`);
  }

  const query = q.trim();
  const groups = GROUP_ORDER.map((type) => ({ type, hits: results.filter((r) => r.type === type) })).filter((g) => g.hits.length > 0);

  return (
    <div className="container stack">
      <div>
        <h1 style={{ fontSize: 24 }}>Search</h1>
        <p className="text-sm muted" style={{ marginTop: 4 }}>
          One query across posts, events, people, study resources, subjects, announcements, scholarships and exams.
        </p>
      </div>

      <form className="row" onSubmit={submit} role="search" style={{ gap: 10, flexWrap: "wrap" }}>
        <div className="search-box" style={{ flex: 1, minWidth: 240, maxWidth: 560 }}>
          <SearchIcon size={17} className="search-icon" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search CampusConnect…"
            aria-label="Search CampusConnect"
            style={{ paddingLeft: 40, borderRadius: 12 }}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          <SearchIcon size={16} /> Search
        </button>
      </form>

      {!user ? (
        <div
          className="row"
          style={{ gap: 9, padding: "10px 14px", borderRadius: 12, background: "var(--color-brand-50)", border: "1px solid var(--color-brand-100)", flexWrap: "wrap" }}
        >
          <Users size={16} aria-hidden="true" style={{ color: "var(--color-brand-700)", flex: "none" }} />
          <span className="text-sm" style={{ color: "var(--color-brand-800)" }}>
            Students are only searchable when you’re signed in.{" "}
            <Link className="link" href="/login?next=%2Fsearch">
              Sign in
            </Link>{" "}
            to find classmates by name, department or interests.
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="stack">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : query.length < 2 ? (
        <div className="card card-pad">
          <EmptyState
            icon={<SearchIcon size={26} />}
            title="Type at least 2 characters"
            body="Search posts, campus events, classmates, syllabus subjects, study materials, announcements, scholarships and exams."
            action={
              <div className="row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {SUGGESTIONS.map((term) => (
                  <button key={term} type="button" className="chip" onClick={() => useSuggestion(term)}>
                    {term}
                  </button>
                ))}
              </div>
            }
          />
        </div>
      ) : results.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            icon={<SearchX size={26} />}
            title={`No results for “${query}”`}
            body="Check the spelling, use fewer words, or try one of these common searches:"
            action={
              <div className="row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {SUGGESTIONS.map((term) => (
                  <button key={term} type="button" className="chip" onClick={() => useSuggestion(term)}>
                    {term}
                  </button>
                ))}
              </div>
            }
          />
        </div>
      ) : (
        <>
          <p className="text-sm muted" role="status">
            {total} {total === 1 ? "result" : "results"} for “{query}”
            {total > results.length ? ` · showing the first ${results.length}` : ""}
          </p>

          {groups.map((group) => (
            <section key={group.type} className="stack" aria-label={`${group.type} results`}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-ink-500)" }}>
                  {group.type}s
                </h2>
                <span className="tag tag-muted">{group.hits.length}</span>
              </div>
              <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 8 }}>
                {group.hits.map((hit, index) => (
                  <li key={`${hit.href}-${index}`}>
                    <Link href={hit.href} className="panel card-pad card-hover" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span
                        className="tag tag-muted"
                        style={{ flex: "none", minWidth: 96, justifyContent: "center", textTransform: "none" }}
                      >
                        {hit.type}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{hit.title}</span>
                        <span className="text-sm muted" style={{ display: "block" }}>
                          {hit.subtitle}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
