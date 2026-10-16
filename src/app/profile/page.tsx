"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, LogOut, Newspaper, Pencil } from "lucide-react";
import { api, type ApiUser } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { PublicUser } from "@/lib/types";
import type { PostView } from "@/lib/serialize";
import type { EventView } from "@/lib/events";
import { EmptyState, ErrorState, Modal, SkeletonCard } from "@/components/ui";
import { SignInPrompt } from "@/components/account/auth-card";
import { EditProfileModal } from "@/components/account/edit-profile-modal";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { ProfileCard, ProfileEventRow, ProfilePostRow, TabBar, type ProfileStats } from "@/components/account/profile-card";

type ProfileResponse = {
  user: PublicUser;
  isSelf: boolean;
  posts: PostView[];
  registrations: EventView[];
  stats: ProfileStats & { upvotes: number };
};

/** PATCH /api/auth/me wipes fields it does not receive, so always send the lot. */
function bodyFrom(user: PublicUser, extra: Record<string, unknown> = {}) {
  return {
    name: user.name,
    username: user.username,
    department: user.department ?? "",
    year: user.year ?? "",
    bio: user.bio,
    interests: user.interests,
    ...extra,
  };
}

export default function MyProfilePage() {
  const { user, setUser, toast } = useApp();
  const router = useRouter();

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"posts" | "events">("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [interestPending, setInterestPending] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api<ProfileResponse>(`/api/users/${encodeURIComponent(user.id)}`);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveInterests(next: string[]) {
    if (!data) return;
    setInterestPending(true);
    try {
      const res = await api<{ user: ApiUser }>("/api/auth/me", {
        method: "PATCH",
        json: bodyFrom(data.user, { interests: next }),
      });
      setData((d) => (d ? { ...d, user: res.user } : d));
      setUser(res.user);
      toast("Interests updated", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setInterestPending(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
      setConfirmSignOut(false);
      toast("Signed out. See you soon!", "success");
      router.push("/posts");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSigningOut(false);
    }
  }

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in to see your profile"
        body="Your profile keeps your posts, registered events, interests and stats in one place."
        next="/profile"
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="container stack">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container stack">
      <ProfileCard
        profile={data.user}
        stats={data.stats}
        interestEditor={{
          pending: interestPending,
          onAdd: (interest) => void saveInterests([...data.user.interests, interest].slice(0, 8)),
          onRemove: (interest) => void saveInterests(data.user.interests.filter((i) => i !== interest)),
        }}
        avatarExtra={
          <AvatarUpload
            current={data.user.avatar}
            onSaved={(url) => setData((d) => (d ? { ...d, user: { ...d.user, avatar: url } } : d))}
          />
        }
        headerActions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setEditOpen(true)}>
              <Pencil size={15} /> Edit profile
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmSignOut(true)}>
              <LogOut size={15} /> Sign out
            </button>
            <Link className="btn btn-ghost" href="/settings">
              Notification settings
            </Link>
          </>
        }
      />

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
              <EmptyState
                icon={<Newspaper size={26} />}
                title="You haven’t posted yet"
                body="Ask a question, share notes or start a discussion — your posts will appear here."
                action={
                  <Link className="btn btn-primary" href="/posts">
                    Browse the feed
                  </Link>
                }
              />
            </div>
          ) : (
            data.posts.map((post) => <ProfilePostRow key={post.id} post={post} />)
          )
        ) : data.registrations.length === 0 ? (
          <div className="card card-pad">
            <EmptyState
              icon={<CalendarDays size={26} />}
              title="No event registrations yet"
              body="Workshops, fests and seminars you register for will show up here."
              action={
                <Link className="btn btn-primary" href="/events">
                  Explore events
                </Link>
              }
            />
          </div>
        ) : (
          data.registrations.map((event) => <ProfileEventRow key={event.id} event={event} />)
        )}
      </div>

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={data.user}
        onSaved={(updated) => {
          setData((d) => (d ? { ...d, user: updated } : d));
          setUser(updated);
        }}
      />

      <Modal
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out of CampusConnect?"
        size="sm"
        labelledBy="sign-out-title"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmSignOut(false)} disabled={signingOut}>
              Stay signed in
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void signOut()} disabled={signingOut} aria-busy={signingOut}>
              {signingOut ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Signing out…
                </>
              ) : (
                <>
                  <LogOut size={15} /> Sign out
                </>
              )}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14.5 }}>
          You’ll need your password to sign back in. Your posts, events and settings stay exactly as they are.
        </p>
      </Modal>
    </div>
  );
}
