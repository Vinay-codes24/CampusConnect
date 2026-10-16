"use client";

import { notFound, useParams } from "next/navigation";
import { findCollege } from "@/lib/colleges";
import { PostsPage } from "@/components/posts/posts-page";

/**
 * Dedicated college community route: /posts/college/dtu, /posts/college/nsut…
 * Unknown slugs 404 instead of silently falling back to the global feed.
 */
export default function CollegePostsRoute() {
  const params = useParams<{ college: string }>();
  const college = findCollege(params.college);
  if (!college) notFound();
  return <PostsPage college={college.id} />;
}
