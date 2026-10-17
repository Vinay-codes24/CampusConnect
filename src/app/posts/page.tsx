import { PostsPage } from "@/components/posts/posts-page";

/**
 * All Colleges feed — aggregates posts from DTU, IGDTUW, NSUT and IIIT-Delhi
 * plus general campus posts. Each college also has a dedicated route under
 * /posts/college/[college]; the shared feed component renders both.
 */
export default function PostsRoute() {
  return <PostsPage college={null} />;
}
