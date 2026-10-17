"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Newspaper, UsersRound } from "lucide-react";

const TABS = [
  { href: "/posts", label: "Posts", icon: Newspaper },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/societies", label: "Societies", icon: UsersRound },
  { href: "/academics", label: "Academics", icon: BookOpen },
] as const;

export function MainNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) || (href === "/academics" && pathname.startsWith("/academics"));

  return (
    <nav className="main-nav" aria-label="Primary">
      <div className="container nav-inner">
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="nav-tab" aria-current={isActive(href) ? "page" : undefined}>
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
