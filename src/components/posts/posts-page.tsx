"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Coffee,
  Flame,
  HelpCircle,
  Laugh,
  Loader2,
  MessageCircle,
  MessageSquareWarning,
  Newspaper,
  PenLine,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { PostCard } from "@/components/posts/post-card";
import { Composer } from "@/components/posts/composer";
import { type RailCommunity } from "@/components/posts/sidebar";
import { CollegeBar, CollegeHeader } from "@/components/posts/college-nav";
import { findCollege } from "@/lib/colleges";
import { PROGRAMS, YEAR_STATUSES } from "@/lib/types";
import type { UniversityId } from "@/lib/universities";
import type { PostView } from "@/lib/serialize";

const FILTERS = [
  { id: "latest", label: "Latest" },
  { id: "trending", label: "Trending" },
  { id: "upvoted", label: "Most Upvoted" },
  { id: "questions", label: "Questions" },
  { id: "resources", label: "Study Resources" },
  { id: "campus", label: "Campus Life" },
  { id: "memes", label: "Memes" },
  { id: "kalesh", label: "Kalesh" },
  { id: "tea", label: "Tea" },
  { id: "gossips", label: "Gossips" },
  { id: "rant", label: "Rant" },
  { id: "jobs", label: "Jobs" },
] as const;

const PAGE_SIZE = 8;

/**
 * The CampusConnect posts feed with Reddit-style college communities.
 * `college = null` renders the All Colleges aggregation at /posts; each
 * college gets a dedicated route at /posts/college/[college].
 */
export function PostsPage({ college }: { college: UniversityId | null }) {
  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="stack" style={{ maxWidth: 780, margin: "0 auto", width: "100%" }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      }
    >
      <PostsFeed college={college} />
    </Suspense>
  );
}

function PostsFeed({ college }: { college: UniversityId | null }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user, toast } = useApp();

  const [activeFilter, setActiveFilter] = useState<string>(searchParams.get("filter") ?? "latest");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [program, setProgram] = useState(searchParams.get("program") ?? "");
  const [year, setYear] = useState(searchParams.get("year") ?? "");
  const [posts, setPosts] = useState<PostView[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // Left rail data.
  const [communities, setCommunities] = useState<RailCommunity[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Live post counts for the community header (null until loaded/failed).
  const [counts, setCounts] = useState<{ counts: Record<string, number>; total: number } | null>(null);

  // The selected topic community lives in the URL so the view stays shareable
  // and back/forward work as expected.
  const community = searchParams.get("community");
  const activeCommunity = communities.find((c) => c.id === community) ?? null;

  const collegeInfo = college ? findCollege(college) : null;
  const collegeLabel = collegeInfo?.shortName ?? college ?? null;
  const hasQueryOrFilter = !!query || activeFilter !== "latest" || !!program || !!year;

  // Live join state for the college currently being viewed (header Join control).
  const activeCollegeRow = useMemo(
    () => (college ? communities.find((c) => c.id === `cm-${college}`) ?? null : null),
    [communities, college],
  );
  const collegeJoined = activeCollegeRow?.joined ?? false;
  const collegeJoining = !!college && joiningId === `cm-${college}`;

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(nextPage === 1);
      setError(null);
      try {
        const params = new URLSearchParams({
          filter: activeFilter,
          page: String(nextPage),
          limit: String(PAGE_SIZE),
        });
        if (query) params.set("q", query);
        if (college) params.set("college", college);
        if (program) params.set("program", program);
        if (year) params.set("year", year);
        if (community) params.set("community", community);
        const data = await api<{ posts: PostView[]; hasMore: boolean }>(`/api/posts?${params}`);
        setPosts((prev) => (nextPage === 1 ? data.posts : [...prev, ...data.posts]));
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, query, college, program, year, community],
  );

  const loadCommunities = useCallback(async () => {
    try {
      const data = await api<{ communities: RailCommunity[] }>("/api/communities");
      setCommunities(data.communities);
    } catch {
      // Membership metadata is decorative; failure should not block the feed.
      setCommunities([]);
    }
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const data = await api<{ counts: Record<string, number>; total: number }>("/api/colleges");
      setCounts(data);
    } catch {
      // Counts are decorative — the header simply omits them if unavailable.
      setCounts(null);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    loadCommunities();
    loadCounts();
  }, [loadCommunities, loadCounts]);

  // Keep the URL shareable without forcing a navigation.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", activeFilter);
    if (query) params.set("q", query);
    else params.delete("q");
    if (program) params.set("program", program);
    else params.delete("program");
    if (year) params.set("year", year);
    else params.delete("year");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, query, program, year]);

  // Infinite scrolling with a button fallback for keyboards and older devices.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) load(page + 1);
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, load, page]);

  function search(e: React.FormEvent) {
    e.preventDefault();
    setQuery(query.trim());
  }

  function updatePost(next: PostView) {
    setPosts((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }

  function clearQueryFilters() {
    setQuery("");
    setActiveFilter("latest");
    setProgram("");
    setYear("");
  }

  /** Selects a topic community (or clears it) purely through the URL. */
  function selectCommunity(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("community", id);
    else params.delete("community");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  /** Toggles membership via /api/communities/[id]/join (colleges + topics). */
  async function toggleJoin(target: { id: string; label: string }) {
    if (joiningId) return;
    setJoiningId(target.id);
    try {
      const res = await api<{ joined: boolean; members: number }>(
        `/api/communities/${target.id}/join`,
        { method: "POST" },
      );
      setCommunities((prev) =>
        prev.map((x) => (x.id === target.id ? { ...x, joined: res.joined, members: res.members } : x)),
      );
      toast(
        res.joined ? `Joined ${target.label}` : `Left ${target.label}`,
        res.joined ? "success" : "default",
      );
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="container">
      {/* Reddit-style college community switcher */}
      <CollegeBar active={college} search={searchParams.toString()} />

      <div className="posts-feed stack" style={{ marginTop: 14 }}>
          {/* college community header */}
          <CollegeHeader
            college={collegeInfo}
            postCount={college ? (counts?.counts[college] ?? null) : counts ? counts.total : null}
            joined={collegeJoined}
            joining={collegeJoining}
            onToggleJoin={
              college
                ? () =>
                    toggleJoin({ id: `cm-${college}`, label: collegeInfo?.shortName ?? college })
                : undefined
            }
          />

          {/* selected topic community banner */}
          {activeCommunity ? (
            <div className="panel card-pad row" style={{ gap: 12, flexWrap: "wrap" }}>
              <span className={`cmt-icon cmt-${["brand", "accent", "sky", "violet", "rose", "amber"].includes(activeCommunity.tone) ? activeCommunity.tone : "brand"}`} aria-hidden="true">
                <Users size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <strong style={{ display: "block" }}>{activeCommunity.name}</strong>
                <span className="text-sm muted">
                  r/{activeCommunity.slug} · {activeCommunity.members.toLocaleString()} members ·{" "}
                  {activeCommunity.postCount} posts
                </span>
              </div>
              <button
                className={`btn btn-sm ${activeCommunity.joined ? "btn-ghost" : "btn-primary"}`}
                onClick={() => toggleJoin({ id: activeCommunity.id, label: activeCommunity.name })}
                disabled={joiningId === activeCommunity.id}
              >
                {joiningId === activeCommunity.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : activeCommunity.joined ? (
                  "Joined"
                ) : (
                  "Join"
                )}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => selectCommunity(null)}>
                <X size={14} /> Show all posts
              </button>
            </div>
          ) : null}

          {/* create post */}
          <div className="panel card-pad">
            <div className="row" style={{ gap: 12 }}>
              <div style={{ width: "100%" }}>
                <button
                  className="row"
                  onClick={() => setComposerOpen(true)}
                  style={{
                    width: "100%",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 999,
                    border: "1px solid var(--color-ink-200)",
                    background: "var(--color-ink-100)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--color-ink-500)",
                    fontSize: 14.5,
                  }}
                >
                  <PenLine size={17} />
                  {activeCommunity
                    ? `Share something with ${activeCommunity.name}…`
                    : collegeLabel
                      ? `Share something with the ${collegeLabel} community…`
                      : "Share something with your campus…"}
                </button>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-sm" onClick={() => setComposerOpen(true)}>
                <PenLine size={15} /> Create a Post
              </button>
              <Link href="/events" className="btn btn-ghost btn-sm">
                <CalendarDays size={15} /> Browse events
              </Link>
              <Link href="/academics" className="btn btn-ghost btn-sm">
                <BookOpen size={15} /> Academics
              </Link>
            </div>
          </div>

          {/* filters + search */}
          <div className="panel" style={{ padding: "12px 14px" }}>
            <form className="row" onSubmit={search} style={{ marginBottom: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-400)" }} />
                <input
                  type="search"
                  className="input"
                  style={{ paddingLeft: 36, borderRadius: 999 }}
                  placeholder="Search posts by keyword or topic…"
                  aria-label="Search posts"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button className="btn btn-ghost btn-sm" type="submit">
                Search
              </button>
            </form>

            <div className="chip-row" role="group" aria-label="Feed filters">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  className="chip"
                  aria-pressed={activeFilter === f.id}
                  onClick={() => setActiveFilter(f.id)}
                >
                  {f.id === "kalesh"
                    ? <Flame size={13} />
                    : f.id === "tea"
                      ? <Coffee size={13} />
                      : f.id === "gossips"
                        ? <MessageCircle size={13} />
                        : f.id === "rant"
                          ? <MessageSquareWarning size={13} />
                          : f.id === "jobs"
                            ? <BriefcaseBusiness size={13} />
                            : f.id === "trending"
                              ? <Sparkles size={13} />
                              : f.id === "questions"
                                ? <HelpCircle size={13} />
                                : f.id === "resources"
                                  ? <BookOpen size={13} />
                                  : f.id === "memes"
                                    ? <Laugh size={13} />
                                    : null}
                  {f.label}
                </button>
              ))}
                {activeFilter !== "latest" ? (
                  <button
                    className="chip"
                    aria-label="Clear category filter"
                    onClick={() => setActiveFilter("latest")}
                  >
                    <X size={13} /> Clear
                  </button>
                ) : null}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label className="row" style={{ gap: 6, alignItems: "center", fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)" }}>
                Program
                <select
                  className="select"
                  style={{ width: "auto", height: 34, padding: "0 26px 0 10px", fontSize: 13.5, fontWeight: 500 }}
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                >
                  <option value="">All programs</option>
                  {PROGRAMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="row" style={{ gap: 6, alignItems: "center", fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)" }}>
                Year / status
                <select
                  className="select"
                  style={{ width: "auto", height: 34, padding: "0 26px 0 10px", fontSize: 13.5, fontWeight: 500 }}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  <option value="">All years</option>
                  {YEAR_STATUSES.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              {program || year ? (
                <button
                  className="chip"
                  onClick={() => {
                    setProgram("");
                    setYear("");
                  }}
                >
                  <X size={13} /> Clear
                </button>
              ) : null}
            </div>
          </div>

          {/* feed */}
          {loading && posts.length === 0 ? (
            <div className="stack">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : error && posts.length === 0 ? (
            <div className="panel">
              <ErrorState message={error} onRetry={() => load(1)} />
            </div>
          ) : posts.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={<Newspaper size={26} />}
                title={
                  activeCommunity
                    ? `No posts in r/${activeCommunity.slug} yet`
                    : hasQueryOrFilter
                      ? "No posts match this view"
                      : collegeLabel
                        ? `No posts in the ${collegeLabel} community yet`
                        : "The feed is empty"
                }
                body={
                  activeCommunity
                    ? "Be the first to post in this community — or head back to the full campus feed."
                    : hasQueryOrFilter
                      ? "Try a different filter or clear your search to see everything."
                      : collegeLabel
                        ? `Be the first to post in the ${collegeLabel} community — or browse all colleges instead.`
                        : "Be the first student to start a conversation on CampusConnect."
                }
                action={
                  <div className="row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                    {activeCommunity ? (
                      <button className="btn btn-ghost" onClick={() => selectCommunity(null)}>
                        Back to all posts
                      </button>
                    ) : null}
                    {hasQueryOrFilter ? (
                      <button className="btn btn-ghost" onClick={clearQueryFilters}>
                        Clear filters
                      </button>
                    ) : null}
                    {!activeCommunity && collegeLabel ? (
                      <button className="btn btn-ghost" onClick={() => router.push("/posts")}>
                        Browse All Colleges
                      </button>
                    ) : null}
                    <button className="btn btn-primary" onClick={() => setComposerOpen(true)}>
                      <PenLine size={15} /> Create a post
                    </button>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="stack" style={{ gap: 16 }}>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onChange={updatePost} onRemoved={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))} />
              ))}

              {hasMore ? (
                <div className="row" style={{ justifyContent: "center", padding: "8px 0 4px" }} ref={sentinel}>
                  <button className="btn btn-ghost" onClick={() => load(page + 1)} disabled={loading}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Load more posts
                  </button>
                </div>
              ) : (
                <p className="text-sm muted" style={{ textAlign: "center", padding: "10px 0" }}>
                  You&rsquo;re all caught up — {posts.length} post{posts.length === 1 ? "" : "s"} in this view.
                </p>
              )}
            </div>
          )}
        </div>

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        communityId={activeCommunity?.id ?? null}
        communityName={activeCommunity ? `r/${activeCommunity.slug}` : null}
        collegeId={college}
        onCreated={(post) => {
          setPosts((prev) => [post, ...prev]);
          // Keep the community banner's post count in sync with the new post.
          if (post.communityId) {
            setCommunities((prev) =>
              prev.map((c) =>
                c.id === post.communityId ? { ...c, postCount: c.postCount + 1 } : c,
              ),
            );
          }
          loadCounts();
          if (activeFilter !== "latest" && activeFilter !== "trending") setActiveFilter("latest");
          if (!user) toast("Posting as a guest — sign in next time to keep your posts.", "default");
        }}
      />
    </div>
  );
}
