import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { getDB, mutate, now, uid } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { commentView } from "@/lib/serialize";
import { optional, str } from "@/lib/validation";
import type { AppNotification, Comment } from "@/lib/types";

/** POST /api/comments — create a comment or a reply. */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = await readBody(req);
  const postId = str(body.postId, { field: "Post" });
  const parentId = optional(body.parentId, 60) || null;
  const text = str(body.body, { field: "Comment", min: 1, max: 2000 });

  const db = getDB();
  const post = db.posts.find((p) => p.id === postId && !p.removed);
  if (!post) throw new ApiError(404, "That post no longer exists.");

  let parent: Comment | undefined;
  if (parentId) {
    parent = db.comments.find((c) => c.id === parentId && !c.removed);
    if (!parent || parent.postId !== postId) throw new ApiError(400, "The comment you replied to no longer exists.");
  }

  const created = mutate((d) => {
    const comment: Comment = {
      id: uid(),
      postId,
      authorId: me.id,
      parentId,
      body: text,
      createdAt: now(),
      upvotes: 1,
      downvotes: 0,
      removed: false,
    };
    d.comments.push(comment);
    const target = d.posts.find((p) => p.id === postId);
    if (target) target.commentCount += 1;
    d.votes.push({ userId: me.id, target: "comment", targetId: comment.id, value: 1, createdAt: now() });

    // In-app notifications for the people involved in this thread.
    const recipients = new Set<string>();
    if (parent && parent.authorId !== me.id) recipients.add(parent.authorId);
    if (post.authorId !== me.id && (!parent || parent.authorId !== post.authorId)) recipients.add(post.authorId);

    const excerpt = text.length > 110 ? `${text.slice(0, 110)}…` : text;
    recipients.forEach((recipientId) => {
      const recipient = d.users.find((u) => u.id === recipientId);
      if (!recipient) return;
      const isReply = !!parent && parent.authorId === recipientId;
      if (isReply && !recipient.notificationPrefs.replies) return;
      if (!isReply && !recipient.notificationPrefs.postInteractions) return;
      const notification: AppNotification = {
        id: uid(),
        userId: recipientId,
        type: isReply ? "reply" : "post_interaction",
        title: isReply ? `${me.name} replied to your comment` : `${me.name} commented on your post`,
        body: excerpt,
        link: `/posts/${postId}`,
        important: false,
        createdAt: now(),
      };
      d.notifications.push(notification);
    });

    return comment;
  });

  const fresh = getDB();
  return json({ comment: commentView(fresh, created, me.id) }, 201);
});
