"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, CalendarDays, Loader2, Newspaper, PenLine, Search, Sparkles, Users, X } from "lucide-react";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { PostCard } from "@/components/posts/post-card";
import { Composer } from "@/components/posts/composer";
import { PostsRail, type RailCommunity } from "@/components/posts/sidebar";
import type { PostView } from "@/lib/serialize";

const FILTERS = [
  { id: "latest", label: "Latest" },
  { id: "trending", label: "Trending" },
  { id: "upvoted", label: "Most Upvoted" },
  { id: "questions", label: "Questions" },
  { id: "resources", label: "Study Resources" },
  { id: "campus", label: "Campus Life" },
  { id: "memes", label: "Memes" },
] as const;

const PAGE_SIZE = 8;

export default function PostsPage() {
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
      <PostsFeed />
    </Suspense>
  );
}

function PostsFeed() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, toast } = useApp();

  const [activeFilter, setActiveFilter] = useState<string>(searchParams.get("filter") ?? "latest");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [posts, setPosts] = useState<PostView[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // Left rail data.
  const [communities, setCommunities] = useState<RailCommunity[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const [communitiesError, setCommunitiesError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [recent, setRecent] = useState<PostView[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  // The selected community lives in the URL so the view stays shareable and
  // back/forward work as expected.
  const community = searchParams.get("community");
  const activeCommunity = communities.find((c) => c.id === community) ?? null;

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
    [activeFilter, query, community],
  );

  const loadCommunities = useCallback(async () => {
    setCommunitiesLoading(true);
    setCommunitiesError(null);
    try {
      const data = await api<{ communities: RailCommunity[] }>("/api/communities");
      setCommunities(data.communities);
    } catch (err) {
      setCommunitiesError((err as Error).message);
    } finally {
      setCommunitiesLoading(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const data = await api<{ posts: PostView[] }>("/api/posts?filter=latest&limit=5");
      setRecent(data.posts);
    } catch (err) {
      setRecentError((err as Error).message);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    loadCommunities();
    loadRecent();
  }, [loadCommunities, loadRecent]);

  // Keep the URL shareable without forcing a navigation.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", activeFilter);
    if (query) params.set("q", query);
    else params.delete("q");
    router.replace(`/posts?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, query]);

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

  /** Selects a community (or clears it) purely through the URL. */
  function selectCommunity(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("community", id);
    else params.delete("community");
    router.replace(`/posts?${params.toString()}`, { scroll: false });
  }

  async function toggleJoin(c: RailCommunity) {
    if (joiningId) return;
    setJoiningId(c.id);
    try {
      const res = await api<{ joined: boolean; members: number }>(
        `/api/communities/${c.id}/join`,
        { method: "POST" },
      );
      setCommunities((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, joined: res.joined, members: res.members } : x)),
      );
      toast(res.joined ? `Joined ${c.name}` : `Left ${c.name}`, res.joined ? "success" : "default");
      if (!res.joined && community === c.id) selectCommunity(null);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setJoiningId(null);
    }
  }

  const rail = (
    <PostsRail
      communities={communities}
      communitiesLoading={communitiesLoading}
      communitiesError={communitiesError}
      onRetryCommunities={loadCommunities}
      onToggleJoin={toggleJoin}
      joiningId={joiningId}
      activeCommunity={community}
      onSelectCommunity={selectCommunity}
      recent={recent}
      recentLoading={recentLoading}
      recentError={recentError}
      onRetryRecent={loadRecent}
      filter={activeFilter}
      onFilter={setActiveFilter}
    />
  );

  return (
    <div className="container">
      <div className="posts-layout">
        {rail}

        <div className="posts-feed stack">
          {/* selected community banner */}
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
                onClick={() => toggleJoin(activeCommunity)}
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
                  {f.id === "trending" ? <Sparkles size={13} /> : null}
                  {f.label}
                </button>
              ))}
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
                    : query || activeFilter !== "latest"
                      ? "No posts match this view"
                      : "The feed is empty"
                }
                body={
                  activeCommunity
                    ? "Be the first to post in this community — or head back to the full campus feed."
                    : query || activeFilter !== "latest"
                      ? "Try a different filter or clear your search to see everything."
                      : "Be the first student to start a conversation on CampusConnect."
                }
                action={
                  <div className="row" style={{ justifyContent: "center", gap: 8 }}>
                    {activeCommunity ? (
                      <button className="btn btn-ghost" onClick={() => selectCommunity(null)}>
                        Back to all posts
                      </button>
                    ) : null}
                    {query || activeFilter !== "latest" ? (
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setQuery("");
                          setActiveFilter("latest");
                        }}
                      >
                        Clear filters
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
      </div>

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        communityId={activeCommunity?.id ?? null}
        communityName={activeCommunity ? `r/${activeCommunity.slug}` : null}
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
          if (activeFilter !== "latest" && activeFilter !== "trending") setActiveFilter("latest");
          if (!user) toast("Posting as a guest — sign in next time to keep your posts.", "default");
        }}
      />
    </div>
  );
}
