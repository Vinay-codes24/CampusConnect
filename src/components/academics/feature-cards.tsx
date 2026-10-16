"use client";

import { BookOpen, CalendarClock, CalendarHeart, GraduationCap, Gauge } from "lucide-react";
import { findUniversity } from "@/lib/universities";

export interface FeatureCard {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  tag: string;
}

export function featureCards(universityId: string): FeatureCard[] {
  const hasAttendanceSync = findUniversity(universityId)?.attendanceIntegration === "nsut-ims";

  return [
    {
      href: "/academics/timetable",
      icon: <CalendarClock size={20} />,
      title: "Timetable",
      body: "Weekly classes, labs and breaks for your batch.",
      tag: "View",
    },
    {
      href: "/academics/attendance",
      icon: <Gauge size={20} />,
      title: "Attendance",
      body: hasAttendanceSync
        ? "Subject-wise attendance with NSUT IMS automatic sync."
        : "Subject-wise attendance from faculty-published records.",
      tag: "Open",
    },
    {
      href: "/academics/holidays",
      icon: <CalendarHeart size={20} />,
      title: "Holidays",
      body: "University-specific holiday list with a countdown to the next one.",
      tag: "Not configured",
    },
    {
      href: "/academics/academic-calendar",
      icon: <GraduationCap size={20} />,
      title: "Academic Calendar",
      body: "Verified academic dates plotted on a month calendar with upcoming events.",
      tag: "View",
    },
    {
      href: "/academics/syllabus",
      icon: <BookOpen size={20} />,
      title: "Subjects",
      body: "Subject list with credits, units and downloadable syllabi for your department.",
      tag: "View",
    },
  ];
}