import { useState, useEffect, useRef } from "react";
import { X, Send, Heart, MessageCircle, Bookmark, Camera, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSwipeDismiss } from "@/hooks/use-swipe-dismiss";

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
  liked: boolean;
  likeCount: number;
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
  const swipeDismiss = useSwipeDismiss({ onDismiss: onClose });
  const [comments, setComments] = useState<Comment[]>([]);
  const [viewerProfile, setViewerProfile] = useState<{ username: string; full_name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentPreview, setCommentPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postId = post?.id ?? null;
  const media = post?.media_urls?.[0] || post?.media_url || post?.image_url || null;

  const goToProfile = (userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  const startReplyTo = (username: string) => {
    const mention = `@${username} `;
    setEditingCommentId(null);
    setText((current) => (current.startsWith(mention) ? current : `${mention}${current}`));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const toggleCommentLike = async (comment: Comment) => {
    if (!myId) return;
    const wasLiked = comment.liked;
    setComments((prev) => prev.map((c) => c.id === comment.id ? {
      ...c,
      liked: !wasLiked,
      likeCount: Math.max(0, c.likeCount + (wasLiked ? -1 : 1)),
    } : c));

    if (wasLiked) {
      const { error } = await supabase
        .from("post_comment_likes" as any)
        .delete()
        .eq("comment_id", comment.id)
        .eq("user_id", myId);
      if (error) {
        setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, liked: true, likeCount: c.likeCount + 1 } : c));
      }
    } else {
      const { error } = await supabase
        .from("post_comment_likes" as any)
        .insert({ comment_id: comment.id, user_id: myId });
      if (error) {
        setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, liked: false, likeCount: Math.max(0, c.likeCount - 1) } : c));
      }
    }
  };

  useEffect(() => {
    if (!myId) {
      setViewerProfile(null);
      return;
    }

    const loadViewerProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", myId)
        .maybeSingle();

      setViewerProfile(data || null);
    };

    loadViewerProfile();
  }, [myId]);

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
      const commentIds = rawComments.map((c: any) => c.id);
      const [{ data: profiles }, { data: allLikes }, { data: myLikes }] = await Promise.all([
        supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", userIds),
        supabase.from("post_comment_likes" as any).select("comment_id").in("comment_id", commentIds),
        myId
          ? supabase.from("post_comment_likes" as any).select("comment_id").in("comment_id", commentIds).eq("user_id", myId)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const likeCounts: Record<string, number> = {};
      ((allLikes as any[]) || []).forEach((row: any) => {
        likeCounts[row.comment_id] = (likeCounts[row.comment_id] || 0) + 1;
      });
      const mySet = new Set(((myLikes as any[]) || []).map((row: any) => row.comment_id));

      setComments(rawComments.map((c: any) => {
        const prof = profileMap.get(c.user_id);
        return {
          ...c,
          username: prof?.username || "trader",
          full_name: prof?.full_name || "Trader",
          avatar_url: prof?.avatar_url || null,
          liked: mySet.has(c.id),
          likeCount: likeCounts[c.id] || 0,
        };
      }));
      setLoading(false);
    };
    load();
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [postId, myId]);

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
          const cids = rawComments.map((c: any) => c.id);
          const [{ data: profiles }, { data: allLikes }, { data: myLikes }] = await Promise.all([
            supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", uids),
            supabase.from("post_comment_likes" as any).select("comment_id").in("comment_id", cids),
            myId
              ? supabase.from("post_comment_likes" as any).select("comment_id").in("comment_id", cids).eq("user_id", myId)
              : Promise.resolve({ data: [] as any[] }),
          ]);
          const pm = new Map((profiles || []).map((p: any) => [p.id, p]));
          const counts: Record<string, number> = {};
          ((allLikes as any[]) || []).forEach((row: any) => {
            counts[row.comment_id] = (counts[row.comment_id] || 0) + 1;
          });
          const mine = new Set(((myLikes as any[]) || []).map((row: any) => row.comment_id));
          setComments(rawComments.map((c: any) => {
            const prof = pm.get(c.user_id);
            return {
              ...c,
              username: prof?.username || "trader",
              full_name: prof?.full_name || "Trader",
              avatar_url: prof?.avatar_url || null,
              liked: mine.has(c.id),
              likeCount: counts[c.id] || 0,
            };
          }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId, myId]);

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
        clearComposer();
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
        liked: false,
        likeCount: 0,
      }]);
      onCountChange(postId, 1);
      clearComposer();

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!postId) return null;

  return (
    <div className="fixed inset-0 z-50 flex touch-pan-y items-end justify-center overflow-hidden overscroll-none" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        {...swipeDismiss}
        className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.5rem)] w-full max-w-lg min-w-0 flex-col overflow-hidden overscroll-contain rounded-t-2xl border-t border-border bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
          <span className="text-sm font-bold text-foreground">Comments</span>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {post && (
          <div className="overflow-hidden border-b border-border px-4 py-2.5">
            <div className="flex min-w-0 items-start gap-2.5 overflow-hidden">
              <button onClick={() => { onClose(); navigate(`/profile/${post.user_id}`); }} className="shrink-0">
                {media ? (
                  <img src={media} alt="Post media" className="h-11 w-11 rounded-lg object-cover" />
                ) : post.avatar_url ? (
                  <img src={post.avatar_url} alt="Profile photo" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-[10px] font-black text-foreground">
                    {getInitials(post.full_name)}
                  </div>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <button onClick={() => { onClose(); navigate(`/profile/${post.user_id}`); }} className="truncate text-xs font-bold text-foreground hover:underline">
                    @{post.username}
                  </button>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(post.created_at)}</span>
                </div>
                {(post.content || post.caption) && (
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[12px] leading-snug text-muted-foreground">{post.content || post.caption}</p>
                )}

                <div className="mt-1.5 flex items-center gap-4 text-muted-foreground">
                  <button onClick={() => onToggleLike(post.id)} aria-label="Like" className="flex items-center gap-1 transition-colors hover:text-foreground">
                    <Heart className={cn("h-4 w-4", post.liked ? "fill-destructive text-destructive" : "")} />
                    {post.likeCount > 0 && <span className="text-[10px] tabular-nums">{post.likeCount}</span>}
                  </button>
                  <div className="flex items-center gap-1 text-foreground">
                    <MessageCircle className="h-4 w-4" />
                    {post.commentCount > 0 && <span className="text-[10px] tabular-nums">{post.commentCount}</span>}
                  </div>
                  <button onClick={onShare} aria-label="Share" className="transition-colors hover:text-foreground">
                    <Send className="h-4 w-4" />
                  </button>
                  <button onClick={() => onToggleSave(post.id)} aria-label="Save" className="ml-auto transition-colors hover:text-foreground">
                    <Bookmark className={cn("h-4 w-4", post.saved ? "fill-primary text-primary" : "")} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments list */}
        <div className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
            </div>
          ) : (
            <>
              {comments.map(c => (
               <div key={c.id} className="relative flex gap-2.5 pl-11 w-full min-w-0">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <button onClick={() => goToProfile(c.user_id)} className="shrink-0" aria-label={`Open ${c.username}'s profile`}>
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={`${c.full_name} avatar`} className="relative z-10 w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[9px] font-black text-foreground">
                      {getInitials(c.full_name)}
                    </div>
                  )}
                </button>
                <div className="min-w-0 max-w-full flex-1 overflow-hidden">
                   <div className="px-0.5 py-1">
                     <div className="flex items-center gap-2 min-w-0">
                       <button
                         onClick={() => goToProfile(c.user_id)}
                         className="min-w-0 truncate text-[11px] font-bold text-foreground hover:underline"
                       >
                         @{c.username}
                       </button>
                       <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                       {c.updated_at && c.updated_at !== c.created_at && <span className="text-[9px] text-muted-foreground">edited</span>}
                     </div>
                     {!!c.content && (
                       <p className="mt-0.5 text-xs leading-relaxed text-foreground/90 break-words whitespace-pre-wrap [overflow-wrap:anywhere]">
                         {c.content}
                       </p>
                     )}
                      {c.media_url && <img src={c.media_url} alt="Comment attachment" className="mt-2 h-28 w-28 max-w-full rounded-xl object-cover" />}
                   </div>
                   <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-1">
                    {myId && (
                      <button
                        onClick={() => toggleCommentLike(c)}
                        className={cn(
                          "flex items-center gap-1 text-[9px] transition-colors",
                          c.liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                        )}
                        aria-label={c.liked ? "Unlike comment" : "Like comment"}
                      >
                        <Heart className={cn("h-3 w-3", c.liked ? "fill-destructive" : "")} />
                        {c.likeCount > 0 && <span className="tabular-nums">{c.likeCount}</span>}
                      </button>
                    )}
                    {myId && (
                      <button
                        onClick={() => startReplyTo(c.username)}
                        className="text-[9px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Reply
                      </button>
                    )}
                    {c.user_id === myId && (
                       <>
                          <button onClick={() => handleEdit(c)} className="text-[9px] text-muted-foreground transition-colors hover:text-foreground">
                           <Pencil className="mr-1 inline h-3 w-3" />Edit
                         </button>
                          <button onClick={() => handleDelete(c.id)} className="text-[9px] text-destructive/70 transition-colors hover:text-destructive">
                           <Trash2 className="mr-1 inline h-3 w-3" />Delete
                         </button>
                       </>
                    )}
                  </div>
                </div>
              </div>
             ))}
            </>
          )}
        </div>

        {myId && (
          <div className="overflow-x-hidden border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
            <div className="relative flex gap-2.5 pl-11 w-full min-w-0">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="relative z-10 shrink-0 bg-card">
                {viewerProfile?.avatar_url ? (
                  <img src={viewerProfile.avatar_url} alt="Your avatar" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[10px] font-black text-foreground">
                    {getInitials(viewerProfile?.full_name || "You")}
                  </div>
                )}
              </div>
              <div className="min-w-0 max-w-full flex-1 overflow-hidden pt-0.5">
                <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
                  <span className="min-w-0 truncate font-bold text-foreground">{viewerProfile?.username || "you"}</span>
                  <span className="shrink-0 text-muted-foreground">{editingCommentId ? "editing reply" : "add reply"}</span>
                </div>
                <div className="mt-1 max-w-full overflow-hidden rounded-2xl border border-border bg-secondary px-3 py-2">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`Reply to ${post.username}...`}
                    rows={2}
                    className="w-full min-w-0 resize-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground [overflow-wrap:anywhere]"
                  />
                  {commentPreview && (
                    <div className="relative mt-2 inline-flex">
                      <img src={commentPreview} alt="Reply upload" className="h-24 w-24 rounded-xl object-cover" />
                      <button
                        onClick={() => {
                          setCommentFile(null);
                          setCommentPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                    <Camera className="h-4 w-4" />
                    Photo
                  </button>
                  {(text || commentPreview || editingCommentId) && (
                    <button onClick={clearComposer} className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={(!text.trim() && !commentPreview && !editingCommentId) || sending}
                    className="ml-auto text-[11px] font-bold text-primary transition-opacity disabled:opacity-40"
                  >
                    {editingCommentId ? "Save" : "Reply"}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCommentFile(e.target.files)} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
