import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
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

interface FeedCommentSheetProps {
  postId: string | null;
  myId: string | null;
  onClose: () => void;
  onCountChange: (postId: string, delta: number) => void;
}

export default function FeedCommentSheet({ postId, myId, onClose, onCountChange }: FeedCommentSheetProps) {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!postId) { setComments([]); return; }
    const load = async () => {
      setLoading(true);
      const { data: rawComments } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (!rawComments || rawComments.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(rawComments.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setComments(rawComments.map((c: any) => {
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
    load();
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [postId]);

  // Realtime
  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`comments-sheet-${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` }, async (payload) => {
        const newC = payload.new as any;
        setComments(prev => {
          if (prev.some(c => c.id === newC.id)) return prev;
          return prev;
        });
        // Reload
        const { data: rawComments } = await supabase
          .from("comments")
          .select("*")
          .eq("post_id", postId)
          .order("created_at", { ascending: true });
        if (rawComments) {
          const uids = [...new Set(rawComments.map((c: any) => c.user_id))];
          const { data: profiles } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", uids);
          const pm = new Map((profiles || []).map((p: any) => [p.id, p]));
          setComments(rawComments.map((c: any) => {
            const prof = pm.get(c.user_id);
            return { ...c, username: prof?.username || "trader", full_name: prof?.full_name || "Trader", avatar_url: prof?.avatar_url || null };
          }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const handleSend = async () => {
    if (!myId || !text.trim() || !postId || sending) return;
    setSending(true);

    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: myId, content: text.trim() })
      .select()
      .single();

    if (!error && data) {
      const { data: prof } = await supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", myId).single();
      setComments(prev => [...prev, {
        ...data,
        username: prof?.username || "trader",
        full_name: prof?.full_name || "Trader",
        avatar_url: prof?.avatar_url || null,
      }]);
      onCountChange(postId, 1);
      setText("");

      // Get post owner
      const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();
      if (post && post.user_id !== myId) {
        await sendNotification({
          userId: post.user_id,
          type: "post_commented",
          title: `@${prof?.username || "someone"} commented on your post`,
          body: text.trim().slice(0, 50),
          relatedUserId: myId,
          entryId: postId,
        });
      }
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    if (!postId) return;
    await supabase.from("comments").delete().eq("id", commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    onCountChange(postId, -1);
  };

  if (!postId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-card border-t border-border rounded-t-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm font-bold text-foreground">Comments</span>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2.5 group">
                <button onClick={() => { onClose(); navigate(`/profile/${c.user_id}`); }} className="shrink-0">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[9px] font-black text-primary-foreground">
                      {getInitials(c.full_name)}
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="bg-secondary rounded-xl px-3 py-2">
                    <span className="text-[11px] font-bold text-foreground">{c.username}</span>
                    <p className="text-xs text-foreground/90 leading-relaxed mt-0.5">{c.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-1">
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
            ))
          )}
        </div>

        {/* Input */}
        {myId && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-card">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Add a comment..."
              className="flex-1 bg-secondary border border-border rounded-full px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-success flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
