import { useState, useEffect } from "react";
import { Heart, Trash2, Pencil, X, MessageCircle, Send, Bookmark } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CommentThread from "@/components/CommentThread";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useSwipeDismiss } from "@/hooks/use-swipe-dismiss";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";

interface PostDetailModalProps {
  open: boolean;
  onClose: () => void;
  post: {
    id: string;
    user_id: string;
    image_url?: string | null;
    media_url?: string | null;
    media_urls?: string[] | null;
    media_type?: string | null;
    content?: string | null;
    caption?: string | null;
    market?: string | null;
    tags?: string[] | null;
    created_at: string;
  } | null;
  myId: string | null;
  onDeleted?: () => void;
  onEdit?: (post: NonNullable<PostDetailModalProps["post"]>) => void;
  onShare?: (post: NonNullable<PostDetailModalProps["post"]>) => void;
}

const PostDetailModal = ({ open, onClose, post, myId, onDeleted, onEdit, onShare }: PostDetailModalProps) => {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const swipeDismiss = useSwipeDismiss({ onDismiss: onClose });
  const [profile, setProfile] = useState<{ username: string; full_name: string; avatar_url: string | null } | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  useEffect(() => {
    if (!post || !open) return;
    const load = async () => {
      const [{ data: prof }, { data: likes }, { data: myLike }, { data: comments }, { data: mySave }] = await Promise.all([
        supabase.from("profiles").select("username, full_name, avatar_url").eq("id", post.user_id).single(),
        supabase.from("feed_likes").select("id").eq("entry_id", post.id),
        myId ? supabase.from("feed_likes").select("id").eq("entry_id", post.id).eq("user_id", myId) : Promise.resolve({ data: [] }),
        supabase.from("feed_comments").select("id").eq("entry_id", post.id),
        myId ? supabase.from("saved_posts").select("id").eq("post_id", post.id).eq("user_id", myId) : Promise.resolve({ data: [] }),
      ]);
      setProfile(prof || { username: "trader", full_name: "Trader", avatar_url: null });
      setLikeCount(likes?.length || 0);
      setLiked((myLike?.length || 0) > 0);
      setCommentCount(comments?.length || 0);
      setSaved((mySave?.length || 0) > 0);

      if (myId && post.user_id !== myId) {
        const { data: conn } = await supabase.from("partner_connections").select("match_score")
          .or(`and(requester_id.eq.${myId},receiver_id.eq.${post.user_id}),and(requester_id.eq.${post.user_id},receiver_id.eq.${myId})`)
          .eq("status", "accepted").maybeSingle();
        setMatchScore(conn?.match_score ?? null);
      } else {
        setMatchScore(null);
      }
    };
    load();
  }, [post?.id, open, myId]);

  const toggleLike = async () => {
    if (!myId || !post) return;
    if (liked) {
      await supabase.from("feed_likes").delete().eq("user_id", myId).eq("entry_id", post.id);
      setLiked(false);
      setLikeCount(c => c - 1);
    } else {
      await supabase.from("feed_likes").insert({ user_id: myId, entry_id: post.id });
      setLiked(true);
      setLikeCount(c => c + 1);
      if (post.user_id !== myId) {
        const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myId).single();
        await sendNotification({
          userId: post.user_id,
          type: "post_liked",
          title: `@${myProf?.username || "someone"} liked your post`,
          body: post.caption?.slice(0, 50) || "Your post got a like",
          relatedUserId: myId,
          entryId: post.id,
        });
      }
    }
  };

  const toggleSave = async () => {
    if (!myId || !post) return;
    if (saved) {
      await supabase.from("saved_posts").delete().eq("user_id", myId).eq("post_id", post.id);
      setSaved(false);
    } else {
      await supabase.from("saved_posts").insert({ user_id: myId, post_id: post.id });
      setSaved(true);
    }
  };

  if (!post) return null;

  const hasMedia = !!(post.media_urls?.length || post.image_url || post.media_url);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className={cn(
        "max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.5rem)] overflow-hidden rounded-none border-border bg-card p-0 sm:rounded-xl",
        hasMedia ? "max-w-3xl" : "max-w-md"
      )}>
        <DialogTitle className="sr-only">Post Detail</DialogTitle>
        <div {...swipeDismiss} className={cn(
          "flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.5rem) flex-col",
          hasMedia && "md:flex-row"
        )}>
          {/* Media (only when present) */}
          {hasMedia && (
          <div className="relative flex min-h-[260px] max-h-[48dvh] items-center justify-center bg-black/30 md:max-h-none md:w-[60%]">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </button>
            {(post.media_urls?.length || 0) > 1 ? (
              <Carousel opts={{ loop: true }} className="w-full">
                <CarouselContent className="ml-0">
                  {(post.media_urls || []).map((url) => (
                    <CarouselItem key={url} className="pl-0">
                      <img src={url} alt="" className="h-full w-full object-contain" />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : (
              <img src={post.media_urls?.[0] || post.media_url || post.image_url || ""} alt="" className="w-full h-full object-contain" />
            )}
          </div>
          )}

          {/* Details */}
          <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", hasMedia && "md:w-[40%]")}>
            {/* Header */}
            <div className="relative flex items-center gap-2.5 border-b border-border p-3">
              {!hasMedia && (
                <button
                  onClick={onClose}
                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => { onClose(); navigate(`/profile/${post.user_id}`); }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-black text-primary-foreground">
                    {getInitials(profile?.full_name || "T")}
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { onClose(); navigate(`/profile/${post.user_id}`); }} className="text-xs font-bold text-foreground hover:underline">
                    {profile?.username || "trader"}
                  </button>
                  {matchScore && post.user_id !== myId && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                      {matchScore}% match
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground">{timeAgo(post.created_at)}</div>
              </div>
            </div>

            {/* Caption */}
            {(post.caption || post.content) && (
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-bold mr-1">{profile?.username}</span>{post.caption || post.content}
                </p>
              </div>
            )}

            {!!post.tags?.length && (
              <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2.5">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Comments */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              <CommentThread
                entryId={post.id}
                entryOwnerId={post.user_id}
                myId={myId}
                commentCount={commentCount}
                onCountChange={(_, delta) => setCommentCount(c => c + delta)}
              />
            </div>

            {/* Actions */}
            <div className="border-t border-border px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 text-muted-foreground">
                  <button onClick={toggleLike} aria-label="Like" className="flex items-center gap-1 transition-colors hover:text-foreground">
                    <Heart className={cn("w-[18px] h-[18px]", liked && "fill-destructive text-destructive")} />
                    {likeCount > 0 && <span className="text-[11px] tabular-nums">{likeCount}</span>}
                  </button>
                  <div className="flex items-center gap-1" aria-label="Comments">
                    <MessageCircle className="w-[18px] h-[18px]" />
                    {commentCount > 0 && <span className="text-[11px] tabular-nums">{commentCount}</span>}
                  </div>
                  {onShare && (
                    <button onClick={() => { onShare(post); onClose(); }} aria-label="Share" className="transition-colors hover:text-foreground">
                      <Send className="w-[18px] h-[18px]" />
                    </button>
                  )}
                  {myId && (
                    <button onClick={toggleSave} aria-label="Save" className="transition-colors hover:text-foreground">
                      <Bookmark className={cn("w-[18px] h-[18px]", saved && "fill-primary text-primary")} />
                    </button>
                  )}
                </div>
                {(myId === post.user_id || isAdmin) && (
                  <div className="flex items-center gap-3">
                    {myId === post.user_id && (
                      <button
                        onClick={() => {
                          onClose();
                          onEdit?.(post);
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const isOther = myId !== post.user_id;
                        if (!confirm(isOther ? "Delete this user's post? (admin)" : "Delete this post?")) return;
                        await supabase.from("posts").delete().eq("id", post.id);
                        onClose();
                        onDeleted?.();
                      }}
                      className="flex items-center gap-1 text-destructive/70 hover:text-destructive text-xs"
                      title={myId === post.user_id ? "Delete post" : "Delete (admin)"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailModal;
