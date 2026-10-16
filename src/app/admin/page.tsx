"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Flag,
  LayoutDashboard,
  Lock,
  Megaphone,
  ShieldX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/components/providers";
import type { Role } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { SignInPrompt } from "@/components/account/auth-card";
import { Overview } from "@/components/admin/overview";
import { ReportsTab } from "@/components/admin/reports";
import { AnnouncementTab } from "@/components/admin/announcement";
import { RecordsTab } from "@/components/admin/records";
import { UsersTab } from "@/components/admin/users";
import { EventsTab } from "@/components/admin/events";

const STAFF: Role[] = ["faculty", "organizer", "admin"];
const MODERATORS: Role[] = ["faculty", "admin"];

const TABS: Array<{ key: string; label: string; icon: LucideIcon; roles: Role[] }> = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, roles: STAFF },
  { key: "reports", label: "Reports", icon: Flag, roles: MODERATORS },
  { key: "announcement", label: "Announcement", icon: Megaphone, roles: MODERATORS },
  { key: "records", label: "Academic records", icon: ClipboardList, roles: MODERATORS },
  { key: "users", label: "Users & roles", icon: Users, roles: ["admin"] },
  { key: "events", label: "Events", icon: CalendarDays, roles: STAFF },
];

const ROLE_BLURB: Record<Role, string> = {
  student: "Students use the feed, events and academics — moderation and publishing tools stay with staff.",
  faculty: "Faculty can moderate reports, publish announcements and manage academic records.",
  organizer: "Club organizers run the events board; moderation and academic records require faculty or an administrator.",
  admin: "Administrators can do everything, including managing accounts and roles.",
};

function AdminInner() {
  const { user } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") ?? "overview";

  const tabs = useMemo(() => TABS.filter((tab) => (user ? tab.roles.includes(user.role) : false)), [user]);

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in for the admin dashboard"
        body="The dashboard is for faculty, club organizers and administrators. Sign in with a staff demo account to open it."
        next="/admin"
      />
    );
  }

  if (user.role === "student") {
    return (
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card card-pad stack" style={{ textAlign: "center", padding: "40px 26px", gap: 14 }}>
          <span className="empty-icon" style={{ background: "#fef2f2", color: "#b91c1c" }} aria-hidden="true">
            <ShieldX size={26} />
          </span>
          <h1 style={{ fontSize: 21 }}>403 — Admin access only</h1>
          <p className="text-sm muted" style={{ maxWidth: 460, margin: "0 auto" }}>
            Your account has the <strong>student</strong> role, and the dashboard is limited to staff roles. Here’s who can open it:
          </p>
          <div className="row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="tag">Faculty</span>
            <span className="tag">Club organizer</span>
            <span className="tag">Administrator</span>
          </div>
          <p className="text-sm muted" style={{ maxWidth: 460, margin: "0 auto" }}>
            {ROLE_BLURB.student}
          </p>
          <div className="row" style={{ justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/posts">
              Back to the feed
            </Link>
            <Link className="btn btn-ghost" href="/profile">
              My profile
            </Link>
          </div>
          <span className="demo-badge">Tip: sign in as faculty@campus.edu or admin@campus.edu to explore the dashboard</span>
        </div>
      </div>
    );
  }

  const activeKey = tabs.find((tab) => tab.key === requestedTab)?.key ?? "overview";
  const blocked = requestedTab !== activeKey && TABS.some((tab) => tab.key === requestedTab);

  if (blocked) {
    const denied = TABS.find((tab) => tab.key === requestedTab)!;
    return (
      <div className="container stack" style={{ maxWidth: 640 }}>
        <div className="card card-pad stack" style={{ textAlign: "center", padding: "38px 26px", gap: 14 }}>
          <span className="empty-icon" style={{ background: "#fffbeb", color: "#92400e" }} aria-hidden="true">
            <Lock size={26} />
          </span>
          <h1 style={{ fontSize: 20 }}>“{denied.label}” is not available for your role</h1>
          <p className="text-sm muted" style={{ maxWidth: 470, margin: "0 auto" }}>
            {ROLE_BLURB[user.role]} The tabs you can open are marked below.
          </p>
          <div className="row" style={{ justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={() => router.replace("/admin?tab=overview")}>
              Back to overview
            </button>
            <Link className="btn btn-ghost" href="/posts">
              Back to the feed
            </Link>
          </div>
        </div>
        <TabBar tabs={tabs} activeKey={activeKey} />
      </div>
    );
  }

  return (
    <div className="container stack">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="row" style={{ gap: 12 }}>
          <Avatar name={user.name} src={user.avatar} size={44} />
          <div>
            <h1 style={{ fontSize: 23 }}>Admin dashboard</h1>
            <p className="text-sm muted" style={{ marginTop: 3 }}>
              {user.name} (@{user.username}) · <span className="tag">{user.role}</span>
            </p>
          </div>
        </div>
        <span className="demo-badge">Demo data</span>
      </div>

      <TabBar tabs={tabs} activeKey={activeKey} />

      <div role="tabpanel" aria-label={tabs.find((tab) => tab.key === activeKey)?.label ?? "Overview"} className="stack">
        {activeKey === "overview" ? <Overview role={user.role} /> : null}
        {activeKey === "reports" ? <ReportsTab /> : null}
        {activeKey === "announcement" ? <AnnouncementTab /> : null}
        {activeKey === "records" ? <RecordsTab /> : null}
        {activeKey === "users" ? <UsersTab viewerId={user.id} /> : null}
        {activeKey === "events" ? <EventsTab /> : null}
      </div>
    </div>
  );
}

function TabBar({ tabs, activeKey }: { tabs: Array<{ key: string; label: string; icon: LucideIcon }>; activeKey: string }) {
  const router = useRouter();
  return (
    <div className="chip-row" role="tablist" aria-label="Dashboard sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            className="chip"
            data-active={activeKey === tab.key}
            aria-selected={activeKey === tab.key}
            onClick={() => router.push(`/admin?tab=${tab.key}`)}
          >
            <Icon size={14} aria-hidden="true" /> {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminInner />
    </Suspense>
  );
}
