"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  LogIn,
  LogOut,
  Search as SearchIcon,
  Settings,
  Shield,
  User as UserIcon,
  CalendarCheck,
  X,
} from "lucide-react";
import { api, timeAgo } from "@/lib/client";
import { useApp } from "@/components/providers";
import { Avatar } from "@/components/ui";

type SearchHit = { type: string; title: string; subtitle: string; href: string };
type Notif = { id: string; title: string; body: string; link: string | null; important: boolean; createdAt: string };

function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function Header() {
  const { user, setUser, unread, refreshNotifications, toast } = useApp();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const searchRef = useDismiss<HTMLFormElement>(searchOpen, () => setSearchOpen(false));
  const bellRef = useDismiss<HTMLDivElement>(bellOpen, () => setBellOpen(false));
  const menuRef = useDismiss<HTMLDivElement>(menuOpen, () => setMenuOpen(false));

  // The search field is only ever mounted once: either in the desktop header
  // row or in the mobile expandable row. Mounting it twice would leave the
  // click-outside ref pointing at the hidden copy.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 860px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const id = window.setTimeout(async () => {
      try {
        const data = await api<{ results: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}`);
        setHits(data.results.slice(0, 7));
        setSearchOpen(true);
      } catch {
        setHits([]);
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!bellOpen || notifs.length > 0) return;
    setLoadingNotifs(true);
    api<{ items: Notif[] }>("/api/notifications?limit=8")
      .then((d) => setNotifs(d.items))
      .catch(() => undefined)
      .finally(() => setLoadingNotifs(false));
  }, [bellOpen, notifs.length]);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMenuOpen(false);
      toast("Signed out. See you soon!", "success");
      router.push("/posts");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function markAllRead() {
    try {
      await api("/api/notifications", { method: "POST", json: { all: true } });
      setNotifs((n) => n.map((x) => ({ ...x, important: x.important })));
      await refreshNotifications();
      toast("All notifications marked as read", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  function goSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    setMobileSearch(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const searchForm = (
    <form className="search-box" onSubmit={goSearch} role="search" ref={searchRef}>
      <SearchIcon size={17} className="search-icon" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts, events, students, resources…"
        aria-label="Search CampusConnect"
        onFocus={() => hits.length > 0 && setSearchOpen(true)}
      />
      {searchOpen && hits.length > 0 ? (
        <div
          className="panel"
          style={{ position: "absolute", top: 46, left: 0, right: 0, padding: 6, zIndex: 80, maxHeight: 380, overflow: "auto" }}
        >
          {hits.map((h, i) => (
            <button
              key={i}
              type="button"
              className="row"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "9px 10px",
                border: 0,
                background: "transparent",
                borderRadius: 10,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-ink-100)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
                router.push(h.href);
              }}
            >
              <span className="tag tag-muted" style={{ flex: "none" }}>
                {h.type}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {h.title}
                </span>
                <span className="text-sm muted" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {h.subtitle}
                </span>
              </span>
            </button>
          ))}
          <button type="submit" className="btn btn-soft btn-sm" style={{ width: "100%", marginTop: 4 }}>
            See all results for “{query.trim()}”
          </button>
        </div>
      ) : null}
    </form>
  );

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="header-logos">
          <img
            src="/university-logos.png"
            alt="Partner universities: IIT Delhi, IGDTUW, Delhi Technological University, NSUT"
          />
        </div>

        <div className="header-center">
          <Link href="/posts" className="brand" aria-label="CampusConnect home">
            <span className="brand-mark" aria-hidden="true">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 3 8l9 5 9-5-9-5Z" />
                <path d="M3 12.5 12 17.5l9-5" />
                <path d="M3 17 12 22l9-5" />
              </svg>
            </span>
            <span>
              Campus<span style={{ color: "var(--color-accent-600)" }}>Connect</span>
              <span className="brand-sub">JAC College</span>
            </span>
          </Link>
        </div>

        <div className="header-right">
          <div className="header-search">{isDesktop ? searchForm : null}</div>
          {!isDesktop ? (
            <button
              className="icon-btn"
              aria-label="Search"
              onClick={() => setMobileSearch((v) => !v)}
              data-active={mobileSearch}
            >
              <SearchIcon size={19} />
            </button>
          ) : null}

          <div style={{ position: "relative" }} ref={bellRef}>
            <button
              className="icon-btn"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              aria-expanded={bellOpen}
              data-active={bellOpen}
              onClick={() => setBellOpen((v) => !v)}
            >
              <Bell size={19} />
              {unread > 0 ? <span className="dot">{unread > 9 ? "9+" : unread}</span> : null}
            </button>

            {bellOpen ? (
              <div className="panel" style={{ position: "absolute", right: 0, top: 48, width: "min(360px, calc(100vw - 24px))", zIndex: 80 }}>
                <div className="row" style={{ justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--color-ink-200)" }}>
                  <strong style={{ fontSize: 15 }}>Notifications</strong>
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                    Mark all read
                  </button>
                </div>
                <div style={{ maxHeight: 340, overflow: "auto", padding: 6 }}>
                  {loadingNotifs ? (
                    <p className="text-sm muted" style={{ padding: 12 }}>
                      Loading…
                    </p>
                  ) : notifs.length === 0 ? (
                    <p className="text-sm muted" style={{ padding: 16, textAlign: "center" }}>
                      You’re all caught up 🎉
                    </p>
                  ) : (
                    notifs.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link ?? "/notifications"}
                        onClick={() => setBellOpen(false)}
                        style={{ display: "block", padding: "10px 12px", borderRadius: 10 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-ink-100)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          {n.important ? <span style={{ color: "#ef4444", fontSize: 14 }}>●</span> : null}
                          <strong style={{ fontSize: 13.5 }}>{n.title}</strong>
                        </span>
                        <span className="text-sm muted" style={{ display: "block" }}>
                          {n.body.length > 92 ? `${n.body.slice(0, 92)}…` : n.body}
                        </span>
                        <span className="text-sm muted" style={{ fontSize: 11.5 }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  href="/notifications"
                  onClick={() => setBellOpen(false)}
                  className="row"
                  style={{ justifyContent: "center", padding: 11, borderTop: "1px solid var(--color-ink-200)", fontWeight: 600, fontSize: 13.5, color: "var(--color-brand-700)" }}
                >
                  View all notifications
                </Link>
              </div>
            ) : null}
          </div>

          {user ? (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                className="row"
                style={{ border: 0, background: "transparent", cursor: "pointer", padding: 4, borderRadius: 999 }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Avatar name={user.name} src={user.avatar} size={36} />
              </button>
              {menuOpen ? (
                <div className="panel" role="menu" style={{ position: "absolute", right: 0, top: 48, width: 250, padding: 6, zIndex: 80 }}>
                  <div style={{ padding: "10px 12px" }}>
                    <strong style={{ display: "block", fontSize: 14.5 }}>{user.name}</strong>
                    <span className="text-sm muted" style={{ display: "block" }}>
                      @{user.username} Â· {user.role}
                    </span>
                  </div>
                  <div className="divider" />
                  <MenuLink href="/profile" icon={<UserIcon size={16} />} onClick={() => setMenuOpen(false)}>
                    My profile
                  </MenuLink>
                  <MenuLink href="/events?tab=my" icon={<CalendarCheck size={16} />} onClick={() => setMenuOpen(false)}>
                    My events
                  </MenuLink>
                  <MenuLink href="/settings" icon={<Settings size={16} />} onClick={() => setMenuOpen(false)}>
                    Notification settings
                  </MenuLink>
                  {user.role !== "student" ? (
                    <MenuLink href="/admin" icon={<Shield size={16} />} onClick={() => setMenuOpen(false)}>
                      Admin dashboard
                    </MenuLink>
                  ) : null}
                  <div className="divider" />
                  <button
                    role="menuitem"
                    className="row"
                    onClick={logout}
                    style={{ width: "100%", padding: "10px 12px", border: 0, background: "transparent", cursor: "pointer", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#b91c1c" }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <Link href="/login" className="btn btn-ghost btn-sm">
                <LogIn size={15} /> Log in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {!isDesktop && mobileSearch ? (
        <div className="container" style={{ paddingBottom: 12 }}>
          <div className="row">
            <div style={{ flex: 1 }}>
              <div style={{ position: "relative" }}>{searchForm}</div>
            </div>
            <button className="icon-btn" aria-label="Close search" onClick={() => setMobileSearch(false)}>
              <X size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="row"
      style={{ padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-ink-100)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {children}
    </Link>
  );
}
