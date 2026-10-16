"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, Newspaper, UserX } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { PublicUser } from "@/lib/types";
import type { PostView } from "@/lib/serialize";
import type { EventView } from "@/lib/events";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { SignInPrompt } from "@/components/account/auth-card";
import { ProfileCard, ProfileEventRow, ProfilePostRow, TabBar, type ProfileStats } from "@/components/account/profile-card";

type ProfileResponse = {
  user: PublicUser;
  isSelf: boolean;
  posts: PostView[];
  registrations: EventView[];
  stats: ProfileStats & { upvotes: number };
};

export default function OtherProfilePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const router = useRouter();
  const { user } = useApp();

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"posts" | "events">("posts");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await api<ProfileResponse>(`/api/users/${encodeURIComponent(id)}`);
      setData(res);
      if (res.isSelf && user) router.replace("/profile");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, router, user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="container stack">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    const notFound = /does not exist|not found/i.test(error);
    return (
      <div className="container">
        {notFound ? (
          <div className="card card-pad">
            <EmptyState
              icon={<UserX size={26} />}
              title="Profile not found"
              body={`We couldn’t find anyone matching “${id}”. They may have changed their username, or the account no longer exists.`}
              action={
                <div className="row" style={{ justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                  <Link className="btn btn-primary" href="/posts">
                    Back to the feed
                  </Link>
                  <Link className="btn btn-ghost" href={`/search?q=${encodeURIComponent(id)}`}>
                    Search for “{id}”
                  </Link>
                </div>
              }
            />
          </div>
        ) : (
          <ErrorState message={error} onRetry={() => void load()} />
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container stack">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className="text-sm muted">Public profile</span>
        <Link className="link text-sm" href="/profile">
          My profile
        </Link>
      </div>

      <ProfileCard profile={data.user} stats={data.stats} />

      <TabBar
        label="Profile content"
        active={tab}
        onChange={(key) => setTab(key as "posts" | "events")}
        tabs={[
          { key: "posts", label: "Posts", count: data.posts.length },
          { key: "events", label: "Events registered", count: data.registrations.length },
        ]}
      />

      <div role="tabpanel" aria-label={tab === "posts" ? "Posts" : "Events registered"} className="stack">
        {tab === "posts" ? (
          data.posts.length === 0 ? (
            <div className="card card-pad">
              <EmptyState icon={<Newspaper size={26} />} title="No posts yet" body={`${data.user.name} hasn’t published anything so far.`} />
            </div>
          ) : (
            data.posts.map((post) => <ProfilePostRow key={post.id} post={post} />)
          )
        ) : data.registrations.length === 0 ? (
          <div className="card card-pad">
            <EmptyState
              icon={<CalendarDays size={26} />}
              title="No registered events"
              body={`${data.user.name} hasn’t registered for any campus events yet.`}
            />
          </div>
        ) : (
          data.registrations.map((event) => <ProfileEventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
