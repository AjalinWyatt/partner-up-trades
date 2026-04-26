import { useState, useEffect, useRef } from "react";
import { Send, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { useNavigate } from "react-router-dom";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  username: string;
  full_name: string;
  avatar_url: string | null;
  like_count: number;
  liked_by_me: boolean;
}

interface CommentThreadProps {
  entryId: string;
  entryOwnerId: string;
  myId: string | null;
  commentCount: number;
  onCountChange: (entryId: string, delta: number) => void;
}

const CommentThread = ({ entryId, entryOwnerId, myId, commentCount, onCountChange }: CommentThreadProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const loadComments = async () => {
    setLoading(true);
    const { data: rawComments } = await supabase
      .from("feed_comments")
      .select("*")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: true });

    if (!rawComments || rawComments.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(rawComments.map((c: any) => c.user_id))];
    const commentIds = rawComments.map((c: any) => c.id);

    const [{ data: profiles }, { data: likes }] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", userIds),
      supabase.from("feed_comment_likes" as any).select("comment_id, user_id").in("comment_id", commentIds),
    ]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const likeCounts = new Map<string, number>();
    const myLikes = new Set<string>();
    (likes || []).forEach((l: any) => {
      likeCounts.set(l.comment_id, (likeCounts.get(l.comment_id) || 0) + 1);
      if (myId && l.user_id === myId) myLikes.add(l.comment_id);
    });

    setComments(rawComments.map((c: any) => {
      const prof = profileMap.get(c.user_id) as any;
      return {
        ...c,
        parent_id: c.parent_id ?? null,
        username: prof?.username || "trader",
        full_name: prof?.full_name || "Trader",
        avatar_url: prof?.avatar_url || null,
        like_count: likeCounts.get(c.id) || 0,
        liked_by_me: myLikes.has(c.id),
      };
    }));
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`comments-${entryId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_comments", filter: `entry_id=eq.${entryId}` }, () => {
        loadComments();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "feed_comments", filter: `entry_id=eq.${entryId}` }, (payload) => {
        const deleted = payload.old as any;
        setComments((prev) => prev.filter((c) => c.id !== deleted.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, entryId, myId]);

  const handleOpen = () => {
    if (!open) {
      setOpen(true);
      loadComments();
    } else {
      setOpen(false);
      setReplyTo(null);
    }
  };

  const handleSend = async () => {
    if (!myId || !text.trim() || sending) return;
    setSending(true);

    const parentComment = replyTo ? comments.find((c) => c.id === replyTo.id) : null;
    // If replying to a reply, attach to the top-level parent
    const parentId = parentComment ? (parentComment.parent_id || parentComment.id) : null;

    const { data, error } = await supabase
      .from("feed_comments")
      .insert({ user_id: myId, entry_id: entryId, content: text.trim(), parent_id: parentId } as any)
      .select()
      .single();

    if (!error && data) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", myId)
        .single();

      setComments((prev) => [...prev, {
        ...(data as any),
        parent_id: (data as any).parent_id ?? null,
        username: prof?.username || "trader",
        full_name: prof?.full_name || "Trader",
        avatar_url: prof?.avatar_url || null,
        like_count: 0,
        liked_by_me: false,
      }]);
      onCountChange(entryId, 1);
      setText("");
      const wasReplying = !!replyTo;
      const repliedToUserId = parentComment?.user_id;
      setReplyTo(null);
      if (parentId) setExpandedReplies((s) => new Set(s).add(parentId));

      const commentPreview = (data as any).content.slice(0, 50);

      // Notify post owner
      if (entryOwnerId !== myId) {
        await sendNotification({
          userId: entryOwnerId,
          type: "post_commented",
          title: `@${prof?.username || "someone"} commented on your session`,
          body: commentPreview,
          relatedUserId: myId,
          entryId,
        });
      }
      // Notify the comment author being replied to (if different)
      if (wasReplying && repliedToUserId && repliedToUserId !== myId && repliedToUserId !== entryOwnerId) {
        await sendNotification({
          userId: repliedToUserId,
          type: "post_commented",
          title: `@${prof?.username || "someone"} replied to your comment`,
          body: commentPreview,
          relatedUserId: myId,
          entryId,
        });
      }
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("feed_comments").delete().eq("id", commentId);
    // Cascade removes replies; recount what we remove
    const removed = comments.filter((c) => c.id === commentId || c.parent_id === commentId).length;
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
    if (removed > 0) onCountChange(entryId, -removed);
  };

  const toggleCommentLike = async (comment: Comment) => {
    if (!myId) return;
    if (comment.liked_by_me) {
      setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, liked_by_me: false, like_count: Math.max(0, c.like_count - 1) } : c));
      await supabase.from("feed_comment_likes" as any).delete().eq("comment_id", comment.id).eq("user_id", myId);
    } else {
      setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, liked_by_me: true, like_count: c.like_count + 1 } : c));
      const { error } = await supabase.from("feed_comment_likes" as any).insert({ comment_id: comment.id, user_id: myId });
      if (!error && comment.user_id !== myId) {
        const { data: prof } = await supabase.from("profiles").select("username").eq("id", myId).single();
        await sendNotification({
          userId: comment.user_id,
          type: "comment_liked",
          title: `@${prof?.username || "someone"} liked your comment`,
          body: comment.content.slice(0, 50),
          relatedUserId: myId,
          entryId,
        });
      }
    }
  };

  const startReply = (c: Comment) => {
    setReplyTo({ id: c.id, username: c.username });
    const parent = c.parent_id || c.id;
    setExpandedReplies((s) => new Set(s).add(parent));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, Comment[]>();
  comments.filter((c) => c.parent_id).forEach((c) => {
    const arr = repliesByParent.get(c.parent_id!) || [];
    arr.push(c);
    repliesByParent.set(c.parent_id!, arr);
  });

  const renderComment = (c: Comment, isReply = false) => (
    <div key={c.id} className={`group flex w-full max-w-full min-w-0 gap-2 overflow-hidden ${isReply ? "pl-8" : ""}`}>
      <button onClick={() => navigate(`/profile/${c.user_id}`)} className="shrink-0">
        {c.avatar_url ? (
          <img src={c.avatar_url} className={`${isReply ? "w-5 h-5" : "w-6 h-6"} rounded-full object-cover`} />
        ) : (
          <div className={`${isReply ? "w-5 h-5 text-[7px]" : "w-6 h-6 text-[8px]"} rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-black text-primary-foreground`}>
            {getInitials(c.full_name)}
          </div>
        )}
      </button>
      <div className="min-w-0 max-w-full flex-1 overflow-hidden">
        <div className="overflow-hidden rounded-lg bg-muted px-2.5 py-1.5">
          <span className="block max-w-full truncate text-[10px] font-bold text-foreground">{c.username}</span>
          <p className="break-words text-[11px] leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">{c.content}</p>
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-1">
          <span className="text-[9px] text-muted-foreground">{timeAgo(c.created_at)}</span>
          {myId && (
            <button onClick={() => startReply(c)} className="text-[9px] font-semibold text-muted-foreground hover:text-foreground">
              Reply
            </button>
          )}
          {c.user_id === myId && (
            <button
              onClick={() => handleDelete(c.id)}
              className="text-[9px] text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {myId && (
        <button onClick={() => toggleCommentLike(c)} className="flex flex-col items-center pt-1.5 shrink-0">
          <Heart className={`w-3 h-3 ${c.liked_by_me ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
          {c.like_count > 0 && <span className="text-[8px] text-muted-foreground mt-0.5">{c.like_count}</span>}
        </button>
      )}
    </div>
  );

  return (
    <div>
      <button onClick={handleOpen} className="flex items-center gap-1 pt-2">
        <span className="text-[10px] text-muted-foreground">
          {commentCount > 0
            ? `${open ? "Hide" : "View"} ${commentCount} comment${commentCount > 1 ? "s" : ""}`
            : open ? "Hide comments" : "Add a comment"}
        </span>
      </button>

      {open && (
        <div className="mt-2 max-w-full touch-pan-y space-y-2 overflow-x-hidden overscroll-contain">
          {loading ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {topLevel.map((c) => {
                const replies = repliesByParent.get(c.id) || [];
                const isExpanded = expandedReplies.has(c.id);
                return (
                  <div key={c.id} className="space-y-2">
                    {renderComment(c)}
                    {replies.length > 0 && !isExpanded && (
                      <button
                        onClick={() => setExpandedReplies((s) => new Set(s).add(c.id))}
                        className="ml-8 text-[9px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        ── View {replies.length} {replies.length === 1 ? "reply" : "replies"}
                      </button>
                    )}
                    {isExpanded && replies.map((r) => renderComment(r, true))}
                    {isExpanded && replies.length > 0 && (
                      <button
                        onClick={() => setExpandedReplies((s) => {
                          const next = new Set(s);
                          next.delete(c.id);
                          return next;
                        })}
                        className="ml-8 text-[9px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        ── Hide replies
                      </button>
                    )}
                  </div>
                );
              })}

              {myId && (
                  <div className="max-w-full overflow-hidden pt-1">
                  {replyTo && (
                    <div className="mb-1 flex min-w-0 items-center justify-between gap-2 px-1">
                      <span className="min-w-0 truncate text-[9px] text-muted-foreground">
                        Replying to <span className="font-bold text-foreground">@{replyTo.username}</span>
                      </span>
                      <button onClick={() => setReplyTo(null)} className="text-[9px] text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      ref={inputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Write a comment..."}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary lg:text-[11px]"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                      className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5 text-primary-foreground" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
