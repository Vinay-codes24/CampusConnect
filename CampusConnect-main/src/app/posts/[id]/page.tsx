"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Newspaper } from "lucide-react";
import { ErrorState, SkeletonCard } from "@/components/ui";
import { api } from "@/lib/client";
import { PostCard } from "@/components/posts/post-card";
import type { PostView } from "@/lib/serialize";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<PostView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "gone">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api<{ post: PostView }>(`/api/posts/${params.id}`);
      setPost(data.post);
      setStatus("ready");
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.toLowerCase().includes("no longer exists")) {
        setStatus("gone");
      } else {
        setMessage(msg);
        setStatus("error");
      }
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container">
      <div className="stack" style={{ maxWidth: 780, margin: "0 auto", width: "100%" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()} style={{ alignSelf: "flex-start" }}>
          <ChevronLeft size={15} /> Back
        </button>

        {status === "loading" ? <SkeletonCard /> : null}

        {status === "error" ? (
          <div className="panel">
            <ErrorState message={message} onRetry={load} />
          </div>
        ) : null}

        {status === "gone" ? (
          <div className="panel" style={{ padding: 32, textAlign: "center" }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>This post is unavailable</h2>
            <p className="text-sm muted" style={{ marginBottom: 16 }}>
              It may have been deleted by its author or removed by a moderator.
            </p>
            <Link href="/posts" className="btn btn-primary">
              Back to the feed
            </Link>
          </div>
        ) : null}

        {status === "ready" && post ? (
          <>
            <PostCard
              post={post}
              showCommentsByDefault
              onChange={setPost}
              onRemoved={() => router.push("/posts")}
            />
            <div className="row" style={{ justifyContent: "center" }}>
              <Link href="/posts" className="btn btn-ghost btn-sm">
                <Newspaper size={14} /> Keep browsing the feed
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
