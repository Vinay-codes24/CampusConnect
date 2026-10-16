"use client";

import { BookOpen, CalendarCheck, CalendarClock, CalendarHeart, Gauge } from "lucide-react";

/**
 * Color identity per academic section — mapped to CSS variables by the
 * `data-tone` attribute on each card (see .feature-card[data-tone] in
 * globals.css). One coordinated palette, one shared card design.
 */
export type FeatureTone = "blue" | "emerald" | "pink" | "purple" | "green";

export interface FeatureCard {
  href: string;
  icon: React.ReactNode;
  title: string;
  tone: FeatureTone;
}

/**
 * The academic tools shown on the selected-college dashboard.
 *
 * The university id stays part of the signature so per-university
 * availability has a single source of truth; every college currently
 * exposes the same five features (attendance sync specifics belong to
 * the attendance page itself).
 */
export function featureCards(_universityId: string): FeatureCard[] {
  return [
    {
      href: "/academics/timetable",
      icon: <CalendarClock size={42} strokeWidth={2} />,
      title: "Timetable",
      tone: "blue",
    },
    {
      href: "/academics/attendance",
      icon: <Gauge size={42} strokeWidth={2} />,
      title: "Attendance",
      tone: "emerald",
    },
    {
      href: "/academics/holidays",
      icon: <CalendarHeart size={42} strokeWidth={2} />,
      title: "Holidays",
      tone: "pink",
    },
    {
      href: "/academics/academic-calendar",
      icon: <CalendarCheck size={42} strokeWidth={2} />,
      title: "Academic Calendar",
      tone: "purple",
    },
    {
      href: "/academics/syllabus",
      icon: <BookOpen size={42} strokeWidth={2} />,
      title: "Subjects",
      tone: "green",
    },
  ];
}
