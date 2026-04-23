import { useState, useEffect, useRef } from "react";
import { X, Send, Heart, MessageCircle, Repeat2, Bookmark, Camera, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  media_url?: string | null;
  media_type?: string | null;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface FeedCommentSheetProps {
  post: {
    id: string;
    user_id: string;
    content?: string | null;
    caption?: string | null;
    media_url?: string | null;
    media_urls?: string[] | null;
    image_url?: string | null;
    media_type?: string | null;
    created_at: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    market?: string | null;
    tags?: string[] | null;
    liked: boolean;
    saved: boolean;
    reposted: boolean;
    likeCount: number;
    commentCount: number;
  } | null;
  myId: string | null;
  onClose: () => void;
  onCountChange: (postId: string, delta: number) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onToggleRepost: (postId: string) => void;
  onShare: () => void;
}

export default function FeedCommentSheet({ post, myId, onClose, onCountChange, onToggleLike, onToggleSave, onToggleRepost, onShare }: FeedCommentSheetProps) {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentPreview, setCommentPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postId = post?.id ?? null;
  const media = post?.media_urls?.[0] || post?.media_url || post?.image_url || null;

  useEffect(() => {
    if (!postId) { setComments([]); setEditingCommentId(null); setCommentFile(null); setCommentPreview(null); return; }
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
    if (!myId || !postId || sending || (!text.trim() && !commentFile && !editingCommentId)) return;
    setSending(true);

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    if (commentFile) {
      const ext = commentFile.name.split(".").pop() || "jpg";
      const filePath = `${myId}/${Date.now()}-comment.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("post-images")
        .upload(filePath, commentFile, { upsert: true, contentType: commentFile.type });
      if (uploadErr) {
        setSending(false);
        return;
      }
      mediaUrl = supabase.storage.from("post-images").getPublicUrl(filePath).data.publicUrl;
      mediaType = commentFile.type.startsWith("image/") ? "image" : null;
    }

    const trimmed = text.trim();

    if (editingCommentId) {
      const current = comments.find((comment) => comment.id === editingCommentId);
      const payload = {
        content: trimmed,
        media_url: mediaUrl ?? current?.media_url ?? null,
        media_type: mediaType ?? current?.media_type ?? null,
      };
      const { data, error } = await supabase
        .from("comments")
        .update(payload)
        .eq("id", editingCommentId)
        .eq("user_id", myId)
        .select()
        .single();

      if (!error && data) {
        setComments((prev) => prev.map((comment) => comment.id === editingCommentId ? { ...comment, ...data } : comment));
        setText("");
        setEditingCommentId(null);
        setCommentFile(null);
        setCommentPreview(null);
      }

      setSending(false);
      return;
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: myId, content: trimmed, media_url: mediaUrl, media_type: mediaType })
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
      setCommentFile(null);
      setCommentPreview(null);

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

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setText(comment.content || "");
    setCommentFile(null);
    setCommentPreview(comment.media_url || null);
    inputRef.current?.focus();
  };

  const handleCommentFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setCommentFile(file);
    setCommentPreview(URL.createObjectURL(file));
  };

  const clearComposer = () => {
    setText("");
    setEditingCommentId(null);
    setCommentFile(null);
    setCommentPreview(null);
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

        {post && (
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-start gap-2.5">
              <button onClick={() => { onClose(); navigate(`/profile/${post.user_id}`); }} className="shrink-0">
                {post.avatar_url ? (
                  <img src={post.avatar_url} alt="Profile photo" className="h-8.5 w-8.5 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-secondary text-[10px] font-black text-foreground">
                    {getInitials(post.full_name)}
                  </div>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { onClose(); navigate(`/profile/${post.user_id}`); }} className="text-xs font-bold text-foreground hover:underline">
                    {post.username}
                  </button>
                  {post.market && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary">
                      {post.market}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                </div>

                {(post.content || post.caption) && (
                  <p className="pt-1 whitespace-pre-wrap text-[13px] leading-6 text-foreground">{post.content || post.caption}</p>
                )}

                {!!post.tags?.length && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {media && (
                  <button className="mt-2.5 block w-full overflow-hidden rounded-xl border border-border bg-muted">
                    <img src={media} alt="Post media" className="aspect-[4/5] w-full object-cover" />
                  </button>
                )}

                <div className="flex items-center gap-4 pt-2.5">
                  <button onClick={() => onToggleLike(post.id)} className="flex items-center gap-1.5 group">
                    <Heart className={cn("h-4 w-4 transition-colors", post.liked ? "fill-destructive text-destructive" : "text-muted-foreground group-hover:text-foreground")} />
                    {post.likeCount > 0 && <span className="text-[11px] text-muted-foreground">{post.likeCount}</span>}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-foreground" />
                    {post.commentCount > 0 && <span className="text-[11px] text-muted-foreground">{post.commentCount}</span>}
                  </div>
                  <button onClick={() => onToggleRepost(post.id)} className="group">
                    <Repeat2 className={cn("h-4 w-4 transition-colors", post.reposted ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  </button>
                  <button onClick={onShare} className="group">
                    <Send className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </button>
                  <button onClick={() => onToggleSave(post.id)} className="group ml-auto">
                    <Bookmark className={cn("h-4 w-4 transition-colors", post.saved ? "fill-primary text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  </button>
                </div>

                {myId && (
                  <div className="pt-3">
                    <div className="rounded-2xl border border-border bg-secondary px-3 py-2.5">
                      {commentPreview && (
                        <div className="pb-2">
                          <img src={commentPreview} alt="Comment upload" className="h-24 w-24 rounded-xl object-cover" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSend()}
                        placeholder={`Comment on ${post.username}'s post...`}
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                      />
                        <button onClick={() => fileInputRef.current?.click()} className="text-muted-foreground transition-colors hover:text-foreground">
                          <Camera className="h-4 w-4" />
                        </button>
                        {(text || commentPreview || editingCommentId) && (
                          <button onClick={clearComposer} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                            Cancel
                          </button>
                        )}
                      <button
                        onClick={handleSend}
                        disabled={(!text.trim() && !commentPreview && !editingCommentId) || sending}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCommentFile(e.target.files)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                   <div className="px-0.5 py-1">
                     <div className="flex items-center gap-2">
                       <span className="text-[11px] font-bold text-foreground">{c.username}</span>
                       <span className="text-[9px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                       {c.updated_at && c.updated_at !== c.created_at && <span className="text-[9px] text-muted-foreground">edited</span>}
                     </div>
                     {!!c.content && <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">{c.content}</p>}
                     {c.media_url && <img src={c.media_url} alt="Comment attachment" className="mt-2 h-28 w-28 rounded-xl object-cover" />}
                   </div>
                  <div className="flex items-center gap-3 mt-1 px-1">
                    {c.user_id === myId && (
                       <>
                         <button onClick={() => handleEdit(c)} className="text-[9px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                           <Pencil className="mr-1 inline h-3 w-3" />Edit
                         </button>
                         <button onClick={() => handleDelete(c.id)} className="text-[9px] text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                           <Trash2 className="mr-1 inline h-3 w-3" />Delete
                         </button>
                       </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
