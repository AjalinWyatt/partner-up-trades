import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Heart, MessageCircle, MoreHorizontal, Link2, Eye, Globe, UserPlus, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CreatePostModal from "@/components/CreatePostModal";
import NotificationBell from "@/components/NotificationBell";
import PostDetailModal from "@/components/PostDetailModal";
import FeedCommentSheet from "@/components/FeedCommentSheet";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { toast } from "sonner";

interface FeedPost {
  id: string;
  user_id: string;
  content?: string | null;
  image_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  caption?: string | null;
  market?: string | null;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  markets: string[];
  liked: boolean;
  likeCount: number;
  commentCount: number;
}

type FeedTab = "my" | "world";

const Feed = () => {
  const { loading: guardLoading } = useOnboardingGuard();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [feedTab, setFeedTab] = useState<FeedTab>("my");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [myMarkets, setMyMarkets] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const loadFeed = useCallback(async (tab?: FeedTab) => {
    const activeTab = tab ?? feedTab;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    setMyId(user.id);

    const { data: myTp } = await supabase.from("trading_profiles").select("markets").eq("user_id", user.id).maybeSingle();
    const userMarkets = myTp?.markets || [];
    setMyMarkets(userMarkets);

    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // For "my" tab, filter by market column matching user's markets
    if (activeTab === "my" && userMarkets.length > 0) {
      query = query.in("market", userMarkets);
    }

    const { data: postsData } = await query;

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = postsData.map((p: any) => p.id);
    const authorIds = [...new Set(postsData.map((p: any) => p.user_id))];

    const [profilesRes, likesRes, myLikesRes, commentsRes, tradingRes] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", authorIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id),
      supabase.from("comments").select("post_id").in("post_id", postIds),
      supabase.from("trading_profiles").select("user_id, markets").in("user_id", authorIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const tradingMap = new Map((tradingRes.data || []).map((t: any) => [t.user_id, t]));

    const likeCounts: Record<string, number> = {};
    (likesRes.data || []).forEach((l: any) => {
      likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
    });
    const myLikedSet = new Set((myLikesRes.data || []).map((l: any) => l.post_id));
    const commentCounts: Record<string, number> = {};
    (commentsRes.data || []).forEach((c: any) => {
      commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
    });

    const feedItems: FeedPost[] = postsData.map((p: any) => {
      const prof = profileMap.get(p.user_id);
      const tp = tradingMap.get(p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        content: p.content || p.caption,
        image_url: p.image_url,
        media_url: p.media_url,
        media_type: p.media_type,
        caption: p.caption,
        market: p.market,
        created_at: p.created_at,
        username: prof?.username || "trader",
        full_name: prof?.full_name || "Trader",
        avatar_url: prof?.avatar_url || null,
        markets: tp?.markets || [],
        liked: myLikedSet.has(p.id),
        likeCount: likeCounts[p.id] || 0,
        commentCount: commentCounts[p.id] || 0,
      };
    });

    setPosts(feedItems);
    setLoading(false);
  }, [feedTab]);

  useEffect(() => {
    setLoading(true);
    loadFeed();

    const channel = supabase
      .channel("feed-realtime-v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => loadFeed())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_likes" }, (payload) => {
        const p = payload.new as any;
        setPosts(prev => prev.map(e => e.id === p.post_id ? { ...e, likeCount: e.likeCount + 1 } : e));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_likes" }, (payload) => {
        const p = payload.old as any;
        setPosts(prev => prev.map(e => e.id === p.post_id ? { ...e, likeCount: Math.max(0, e.likeCount - 1) } : e));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
        const p = payload.new as any;
        setPosts(prev => prev.map(e => e.id === p.post_id ? { ...e, commentCount: e.commentCount + 1 } : e));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [feedTab]);

  const switchTab = (tab: FeedTab) => {
    setFeedTab(tab);
  };

  const toggleLike = async (postId: string) => {
    if (!myId) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.liked) {
      await supabase.from("post_likes").delete().eq("user_id", myId).eq("post_id", postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: false, likeCount: p.likeCount - 1 } : p));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: myId });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: true, likeCount: p.likeCount + 1 } : p));
      if (post.user_id !== myId) {
        const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myId).single();
        await sendNotification({
          userId: post.user_id,
          type: "post_liked",
          title: `@${myProf?.username || "someone"} liked your post`,
          body: post.content?.slice(0, 50) || "Your post got a like",
          relatedUserId: myId,
          entryId: postId,
        });
      }
    }
  };

  const primaryMarket = myMarkets[0] || "Forex";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <button onClick={() => setShowCreatePost(true)} className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-success flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary-foreground" />
            </button>

            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary to-success flex items-center justify-center">
                <Globe className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-black text-foreground tracking-tight">
                traders<span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">world</span>
              </span>
            </div>

            <NotificationBell />
          </div>

          {/* Tabs */}
          <div className="flex px-5 gap-1">
            <button
              onClick={() => switchTab("my")}
              className={cn(
                "flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors",
                feedTab === "my"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              My Feed
            </button>
            <button
              onClick={() => switchTab("world")}
              className={cn(
                "flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors",
                feedTab === "world"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              World Feed
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-success/20 text-sm font-black text-primary">
              {primaryMarket.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Create a post</p>
              <p className="text-xs text-muted-foreground">Share a thought, chart, recap, or setup</p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
              Post
            </div>
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-success/20 border border-primary/20 flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">
              {feedTab === "my" ? `No posts in your markets yet` : "No posts yet"}
            </p>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-5">Share your setup, your mindset, your journey, or a quick update.</p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-success text-sm font-bold text-primary-foreground"
            >
              Create post
            </button>
          </div>
        ) : (
          <div className="px-4 pb-4 pt-3 space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                {/* Post Header */}
                <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
                  <button onClick={() => navigate(`/profile/${post.user_id}`)}>
                    {post.avatar_url ? (
                      <img src={post.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-black text-primary-foreground">
                        {getInitials(post.full_name)}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => navigate(`/profile/${post.user_id}`)} className="text-[13px] font-bold text-foreground hover:underline">
                        {post.username}
                      </button>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" fill="url(#vbf)" />
                        <path d="M6.5 10l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <defs><linearGradient id="vbf" x1="0" y1="0" x2="20" y2="20"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--success))" /></linearGradient></defs>
                      </svg>
                      {/* Market tag from post */}
                      {(post.market || post.markets[0]) && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                          {post.market || post.markets[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                  </div>
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}>
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </button>
                    {menuOpen === post.id && (
                      <div className="absolute right-0 top-7 w-48 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                        <button
                          onClick={() => { navigate(`/profile/${post.user_id}`); setMenuOpen(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="w-4 h-4" /> View Profile
                        </button>
                        {post.user_id !== myId && (
                          <>
                            <button
                              onClick={() => { navigate(`/profile/${post.user_id}`); setMenuOpen(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors"
                            >
                              <Link2 className="w-4 h-4" /> Request Match
                            </button>
                            <button
                              onClick={() => setMenuOpen(null)}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors"
                            >
                              <UserPlus className="w-4 h-4" /> Follow
                            </button>
                          </>
                        )}
                        {(isAdmin || post.user_id === myId) && (
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this post?")) return;
                              await supabase.from("posts").delete().eq("id", post.id);
                              setPosts(prev => prev.filter(p => p.id !== post.id));
                              setMenuOpen(null);
                              toast.success("Post deleted");
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                {(post.content || post.caption) && (
                  <div className="px-4 pb-3">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">{post.content || post.caption}</p>
                  </div>
                )}

                {/* Post Media - image */}
                {(post.image_url || (post.media_url && post.media_type === "image")) && (
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="mb-3 block w-full overflow-hidden border-y border-border bg-muted"
                  >
                    <img src={post.media_url || post.image_url!} alt="" className="w-full max-h-[500px] object-cover" />
                  </button>
                )}

                {/* Post Media - video */}
                {post.media_url && post.media_type === "video" && (
                  <div className="mb-3 overflow-hidden border-y border-border bg-muted">
                    <video src={post.media_url} controls className="w-full max-h-[500px]" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-5 border-t border-border px-4 py-3">
                  <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 group">
                    <Heart className={cn("w-5 h-5 transition-colors", post.liked ? "fill-destructive text-destructive" : "text-muted-foreground group-hover:text-foreground")} />
                    {post.likeCount > 0 && <span className="text-[11px] text-muted-foreground">{post.likeCount}</span>}
                  </button>
                  <button onClick={() => setCommentPostId(post.id)} className="flex items-center gap-1.5 group">
                    <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {post.commentCount > 0 && <span className="text-[11px] text-muted-foreground">{post.commentCount}</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreatePostModal open={showCreatePost} onClose={() => setShowCreatePost(false)} onCreated={() => loadFeed()} />
      <PostDetailModal
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        myId={myId}
      />
      <FeedCommentSheet
        postId={commentPostId}
        myId={myId}
        onClose={() => setCommentPostId(null)}
        onCountChange={(postId, delta) => {
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + delta } : p));
        }}
      />
    </AppLayout>
  );
};

export default Feed;
