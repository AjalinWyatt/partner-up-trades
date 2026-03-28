import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { useNavigate } from "react-router-dom";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
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

    const userIds = [...new Set(rawComments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    setComments(rawComments.map(c => {
      const prof = profileMap.get(c.user_id);
      return {
        ...c,
        username: prof?.username || "trader",
        full_name: prof?.full_name || "Trader",
        avatar_url: prof?.avatar_url || null,
      };
    }));
    setLoading(false);
  };

  // Real-time comment updates when thread is open
  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`comments-${entryId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_comments", filter: `entry_id=eq.${entryId}` }, async (payload) => {
        const newComment = payload.new as any;
        // Don't duplicate if we already added it optimistically
        setComments(prev => {
          if (prev.some(c => c.id === newComment.id)) return prev;
          return prev; // will be picked up by loadComments below
        });
        loadComments();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "feed_comments", filter: `entry_id=eq.${entryId}` }, (payload) => {
        const deleted = payload.old as any;
        setComments(prev => prev.filter(c => c.id !== deleted.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, entryId]);

  const handleOpen = () => {
    if (!open) {
      setOpen(true);
      loadComments();
    } else {
      setOpen(false);
    }
  };

  const handleSend = async () => {
    if (!myId || !text.trim() || sending) return;
    setSending(true);

    const { data, error } = await supabase
      .from("feed_comments")
      .insert({ user_id: myId, entry_id: entryId, content: text.trim() })
      .select()
      .single();

    if (!error && data) {
      // Fetch my profile for display
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", myId)
        .single();

      setComments(prev => [...prev, {
        ...data,
        username: prof?.username || "trader",
        full_name: prof?.full_name || "Trader",
        avatar_url: prof?.avatar_url || null,
      }]);
      onCountChange(entryId, 1);
      setText("");

      // Send notification to post owner (not self)
      if (entryOwnerId !== myId) {
        const commentPreview = text.trim().slice(0, 50);
        await sendNotification({
          userId: entryOwnerId,
          type: "post_commented",
          title: `@${prof?.username || "someone"} commented on your session`,
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
    setComments(prev => prev.filter(c => c.id !== commentId));
    onCountChange(entryId, -1);
  };

  return (
    <div>
      {/* Toggle button */}
      <button onClick={handleOpen} className="flex items-center gap-1 pt-2">
        <span className="text-[10px] text-muted-foreground">
          {commentCount > 0
            ? `${open ? "Hide" : "View"} ${commentCount} comment${commentCount > 1 ? "s" : ""}`
            : open ? "Hide comments" : "Add a comment"}
        </span>
      </button>

      {/* Thread */}
      {open && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {comments.map(c => (
                <div key={c.id} className="flex gap-2 group">
                  <button onClick={() => navigate(`/profile/${c.user_id}`)} className="shrink-0">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[8px] font-black text-primary-foreground">
                        {getInitials(c.full_name)}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] font-bold text-foreground">{c.username}</span>
                      <p className="text-[11px] text-foreground/90 leading-relaxed">{c.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 px-1">
                      <span className="text-[9px] text-muted-foreground">{timeAgo(c.created_at)}</span>
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
                </div>
              ))}

              {/* Input */}
              {myId && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Write a comment..."
                    className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5 text-primary-foreground" />
                  </button>
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
