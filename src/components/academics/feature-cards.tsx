"use client";

import { BookOpen, CalendarClock, CalendarHeart, GraduationCap, Gauge } from "lucide-react";

export interface FeatureCard {
  href: string;
  icon: React.ReactNode;
  title: string;
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
      icon: <CalendarClock size={20} />,
      title: "Timetable",
    },
    {
      href: "/academics/attendance",
      icon: <Gauge size={20} />,
      title: "Attendance",
    },
    {
      href: "/academics/holidays",
      icon: <CalendarHeart size={20} />,
      title: "Holidays",
    },
    {
      href: "/academics/academic-calendar",
      icon: <GraduationCap size={20} />,
      title: "Academic Calendar",
    },
    {
      href: "/academics/syllabus",
      icon: <BookOpen size={20} />,
      title: "Subjects",
    },
  ];
}
