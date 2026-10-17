"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Clock,
  Code,
  Cpu,
  Dumbbell,
  Flame,
  HelpCircle,
  Home,
  Laugh,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { timeAgo } from "@/lib/client";
import type { PostView } from "@/lib/serialize";

export type RailCommunity = {
  id: string;
  name: string;
  slug: string;
  description: string;
  members: number;
  icon: string;
  tone: string;
  postCount: number;
  joined: boolean;
};

const ICONS: Record<string, LucideIcon> = {
  code: Code,
  cpu: Cpu,
  wrench: Wrench,
  sparkles: Sparkles,
  briefcase: Briefcase,
  laugh: Laugh,
  home: Home,
  dumbbell: Dumbbell,
};

const TONES = ["brand", "accent", "sky", "violet", "rose", "amber"];

const EXPLORE_FEEDS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "trending", label: "Trending today", icon: Flame },
  { id: "upvoted", label: "Top posts", icon: TrendingUp },
  { id: "questions", label: "Questions", icon: HelpCircle },
  { id: "resources", label: "Study resources", icon: BookOpen },
  { id: "memes", label: "Campus memes", icon: Laugh },
];

const EXPLORE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/events?filter=week", label: "Events this week", icon: CalendarDays },
  { href: "/academics/exam-schedule", label: "Exam schedule", icon: CalendarCheck },
  { href: "/academics/scholarships", label: "Scholarships", icon: Award },
  { href: "/academics/timetable", label: "My timetable", icon: Clock },
];

const PREVIEW_COMMUNITIES = 6;

function fmtMembers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="stack" style={{ gap: 8 }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="skeleton" style={{ display: "block", height: 40, borderRadius: 10 }} />
      ))}
    </div>
  );
}

function RailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="text-sm muted" style={{ margin: 0 }}>
        {message}
      </p>
      <button className="btn btn-ghost btn-sm" onClick={onRetry}>
        <RefreshCw size={14} /> Try again
      </button>
    </div>
  );
}

type Props = {
  communities: RailCommunity[];
  communitiesLoading: boolean;
  communitiesError: string | null;
  onRetryCommunities: () => void;
  onToggleJoin: (community: RailCommunity) => void;
  joiningId: string | null;
  activeCommunity: string | null;
  onSelectCommunity: (id: string | null) => void;
  recent: PostView[];
  recentLoading: boolean;
  recentError: string | null;
  onRetryRecent: () => void;
  filter: string;
  onFilter: (id: string) => void;
};

/**
 * Reddit-style left rail for the Posts feed: recent posts, communities with a
 * working Join toggle, and an Explore panel of feed filters and campus links.
 */
export function PostsRail(props: Props) {
  const [showAll, setShowAll] = useState(false);
  const {
    communities,
    communitiesLoading,
    communitiesError,
    onRetryCommunities,
    onToggleJoin,
    joiningId,
    activeCommunity,
    onSelectCommunity,
    recent,
    recentLoading,
    recentError,
    onRetryRecent,
    filter,
    onFilter,
  } = props;

  const visible = showAll ? communities : communities.slice(0, PREVIEW_COMMUNITIES);

  return (
    <aside className="posts-rail stack" aria-label="Community sidebar">
      {/* ---------------------------- recent posts --------------------------- */}
      <section className="panel rail-card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <h2 className="rail-title" style={{ marginBottom: 0 }}>
            Recent posts
          </h2>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: "3px 9px", fontSize: 12.5 }}
            onClick={() => onFilter("latest")}
            aria-pressed={filter === "latest"}
          >
            View all
          </button>
        </div>

        {recentLoading ? (
          <SkeletonRows count={4} />
        ) : recentError ? (
          <RailError message={recentError} onRetry={onRetryRecent} />
        ) : recent.length === 0 ? (
          <p className="text-sm muted" style={{ margin: 0 }}>
            No posts yet — start the first conversation.
          </p>
        ) : (
          <ul className="stack" style={{ gap: 2, listStyle: "none", margin: 0, padding: 0 }}>
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`} className="rail-link" style={{ alignItems: "flex-start" }}>
                  <span style={{ minWidth: 0, width: "100%" }}>
                    <span
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        fontWeight: 600,
                        fontSize: 13.5,
                        lineHeight: 1.35,
                      }}
                    >
                      {p.title}
                    </span>
                    <span className="text-sm muted" style={{ display: "block", marginTop: 3 }}>
                      ▲ {p.score} · {p.commentCount} comments · {timeAgo(p.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --------------------------- communities ----------------------------- */}
      <section className="panel rail-card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <h2 className="rail-title" style={{ marginBottom: 0 }}>
            Join communities
          </h2>
          {communities.length > 0 ? (
            <span className="text-sm muted">{communities.length} total</span>
          ) : null}
        </div>

        {communitiesLoading ? (
          <SkeletonRows count={4} />
        ) : communitiesError ? (
          <RailError message={communitiesError} onRetry={onRetryCommunities} />
        ) : communities.length === 0 ? (
          <p className="text-sm muted" style={{ margin: 0 }}>
            No communities have been created yet.
          </p>
        ) : (
          <>
            <ul className="stack" style={{ gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
              {visible.map((c) => {
                const active = activeCommunity === c.id;
                const Icon = ICONS[c.icon] ?? Users;
                const tone = TONES.includes(c.tone) ? c.tone : "brand";
                return (
                  <li key={c.id} className="row" style={{ gap: 6, alignItems: "center" }}>
                    <button
                      className="rail-link"
                      style={{ flex: 1, minWidth: 0, padding: 6 }}
                      aria-pressed={active}
                      title={`${c.name} — ${c.description}`}
                      onClick={() => onSelectCommunity(active ? null : c.id)}
                    >
                      <span className={`cmt-icon cmt-${tone}`} aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            fontSize: 13.5,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.name}
                        </strong>
                        <span className="text-sm muted" style={{ display: "block" }}>
                          r/{c.slug} · {fmtMembers(c.members)} members
                        </span>
                      </span>
                    </button>
                    <button
                      className={`btn btn-sm ${c.joined ? "btn-ghost" : "btn-primary"}`}
                      style={{ flex: "none", minWidth: 64, justifyContent: "center" }}
                      onClick={() => onToggleJoin(c)}
                      disabled={joiningId === c.id}
                      aria-label={
                        c.joined ? `Leave ${c.name}` : `Join ${c.name}`
                      }
                    >
                      {joiningId === c.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : c.joined ? (
                        "Joined"
                      ) : (
                        "Join"
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {communities.length > PREVIEW_COMMUNITIES ? (
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", marginTop: 8, justifyContent: "center" }}
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
              >
                {showAll ? "Show fewer" : `Show all ${communities.length} communities`}
              </button>
            ) : null}

            {activeCommunity ? (
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", marginTop: 6, justifyContent: "center" }}
                onClick={() => onSelectCommunity(null)}
              >
                Back to all posts
              </button>
            ) : null}
          </>
        )}

        <p className="text-sm muted" style={{ margin: "10px 0 0" }}>
          Demo communities — membership is saved to the local database.
        </p>
      </section>

      {/* ------------------------------ explore ------------------------------ */}
      <section className="panel rail-card">
        <h2 className="rail-title">Explore</h2>

        <div className="stack" style={{ gap: 2 }}>
          {EXPLORE_FEEDS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="rail-link"
                aria-pressed={filter === item.id}
                onClick={() => onFilter(item.id)}
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="divider" style={{ margin: "10px 0" }} />

        <div className="stack" style={{ gap: 2 }}>
          {EXPLORE_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="rail-link">
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
