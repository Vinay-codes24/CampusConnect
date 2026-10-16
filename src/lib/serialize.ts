import type { Comment, Database, Post, User } from "./types";

/** Community ("subreddit") summary attached to posts. */
export type LiteCommunity = {
  id: string;
  name: string;
  slug: string;
};

/** Public author shape returned with posts and comments. */
export type LiteUser = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: User["role"];
  department: string | null;
  year: string | null;
  verified: boolean;
};

export function liteUser(db: Database, userId: string): LiteUser {
  const u = db.users.find((x) => x.id === userId);
  if (!u) {
    return {
      id: userId,
      name: "Deleted user",
      username: "deleted",
      avatar: null,
      role: "student",
      department: null,
      year: null,
      verified: false,
    };
  }
  const { id, name, username, avatar, role, department, year, verified } = u;
  return { id, name, username, avatar, role, department, year, verified };
}

export type PostView = Post & {
  author: LiteUser;
  community: LiteCommunity | null;
  viewerVote: -1 | 0 | 1;
  canDelete: boolean;
  score: number;
};

export type CommentView = Comment & {
  author: LiteUser;
  viewerVote: -1 | 0 | 1;
  canDelete: boolean;
  score: number;
};

export function score(target: { upvotes: number; downvotes: number }): number {
  return target.upvotes - target.downvotes;
}

export function voteValue(db: Database, userId: string | null, target: "post" | "comment", targetId: string): -1 | 0 | 1 {
  if (!userId) return 0;
  return db.votes.find((v) => v.userId === userId && v.target === target && v.targetId === targetId)?.value ?? 0;
}

export function postView(db: Database, post: Post, viewerId: string | null): PostView {
  const author = liteUser(db, post.authorId);
  const found = post.communityId
    ? db.communities.find((c) => c.id === post.communityId)
    : undefined;
  const community = found ? { id: found.id, name: found.name, slug: found.slug } : null;
  return {
    ...post,
    author,
    community,
    viewerVote: voteValue(db, viewerId, "post", post.id),
    canDelete: !!viewerId && (post.authorId === viewerId || viewerIsModerator(db, viewerId)),
    score: score(post),
  };
}

export function commentView(db: Database, comment: Comment, viewerId: string | null): CommentView {
  return {
    ...comment,
    author: liteUser(db, comment.authorId),
    viewerVote: voteValue(db, viewerId, "comment", comment.id),
    canDelete: !!viewerId && (comment.authorId === viewerId || viewerIsModerator(db, viewerId)),
    score: score(comment),
  };
}

export function viewerIsModerator(db: Database, userId: string): boolean {
  const u = db.users.find((x) => x.id === userId);
  return !!u && (u.role === "admin" || u.role === "faculty");
}
