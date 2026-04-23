import { useState, useEffect } from "react";
import { Heart, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CommentThread from "@/components/CommentThread";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

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
}

const PostDetailModal = ({ open, onClose, post, myId, onDeleted }: PostDetailModalProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ username: string; full_name: string; avatar_url: string | null } | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  useEffect(() => {
    if (!post || !open) return;
    const load = async () => {
      const [{ data: prof }, { data: likes }, { data: myLike }, { data: comments }] = await Promise.all([
        supabase.from("profiles").select("username, full_name, avatar_url").eq("id", post.user_id).single(),
        supabase.from("feed_likes").select("id").eq("entry_id", post.id),
        myId ? supabase.from("feed_likes").select("id").eq("entry_id", post.id).eq("user_id", myId) : Promise.resolve({ data: [] }),
        supabase.from("feed_comments").select("id").eq("entry_id", post.id),
      ]);
      setProfile(prof || { username: "trader", full_name: "Trader", avatar_url: null });
      setLikeCount(likes?.length || 0);
      setLiked((myLike?.length || 0) > 0);
      setCommentCount(comments?.length || 0);

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

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border rounded-xl max-h-[90vh]">
        <DialogTitle className="sr-only">Post Detail</DialogTitle>
        <div className="flex flex-col md:flex-row max-h-[90vh]">
          {/* Media / Content */}
          <div className="md:w-[60%] bg-black/30 flex items-center justify-center min-h-[300px] max-h-[60vh] md:max-h-none">
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
            ) : post.image_url || (post.media_url && post.media_type === "image") || post.media_urls?.[0] ? (
              <img src={post.media_urls?.[0] || post.media_url || post.image_url || ""} alt="" className="w-full h-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-8">
                <p className="max-w-lg whitespace-pre-wrap text-center text-base leading-relaxed text-foreground">
                  {post.content || post.caption}
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:w-[40%] flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-2.5 p-3 border-b border-border">
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
            <div className="flex-1 px-3 py-2 overflow-y-auto">
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
                <button onClick={toggleLike} className="flex items-center gap-1.5">
                  <Heart className={`w-5 h-5 ${liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                  {likeCount > 0 && <span className="text-xs text-muted-foreground">{likeCount}</span>}
                </button>
                {myId === post.user_id && (
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this post?")) return;
                      await supabase.from("posts").delete().eq("id", post.id);
                      onClose();
                      onDeleted?.();
                    }}
                    className="flex items-center gap-1 text-destructive/70 hover:text-destructive text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
