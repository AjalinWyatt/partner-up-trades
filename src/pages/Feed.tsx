import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Heart, MessageCircle, MoreHorizontal, Link2, Eye, Globe, ChevronDown, UserPlus } from "lucide-react";
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

interface FeedPost {
  id: string;
  user_id: string;
  content?: string | null;
  image_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  caption?: string | null;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  markets: string[];
  liked: boolean;
  likeCount: number;
  commentCount: number;
}

const MARKET_OPTIONS = ["All", "Forex", "Futures", "Options"] as const;

const Feed = () => {
  const { loading: guardLoading } = useOnboardingGuard();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [myMarkets, setMyMarkets] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [marketFilter, setMarketFilter] = useState<string>("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [marketCounts, setMarketCounts] = useState<Record<string, number>>({});

  const loadMarketCounts = useCallback(async () => {
    const { data } = await supabase.from("trading_profiles").select("markets");
    const counts: Record<string, number> = { All: 0, Forex: 0, Futures: 0, Options: 0 };
    (data || []).forEach((tp: any) => {
      if (tp.markets?.length > 0) {
        counts.All++;
        tp.markets.forEach((m: string) => {
          if (counts[m] !== undefined) counts[m]++;
        });
      }
    });
    setMarketCounts(counts);
  }, []);

  const loadFeed = useCallback(async (filter?: string) => {
    const activeFilter = filter ?? marketFilter;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setMyId(user.id);

    // Get my markets for default filter
    const { data: myTp } = await supabase.from("trading_profiles").select("markets").eq("user_id", user.id).maybeSingle();
    const userMarkets = myTp?.markets || [];
    setMyMarkets(userMarkets);

    // Get all trading profiles to know which users trade which markets
    let userIdsToShow: string[] = [];

    if (activeFilter === "All") {
      // Show posts from users who share same markets as me, or all if no filter
      if (userMarkets.length > 0) {
        const { data: tradingProfiles } = await supabase.from("trading_profiles").select("user_id, markets");
        userIdsToShow = (tradingProfiles || [])
          .filter((tp: any) => tp.markets?.some((m: string) => userMarkets.includes(m)))
          .map((tp: any) => tp.user_id);
      }
    } else {
      // Filter by specific market
      const { data: tradingProfiles } = await supabase.from("trading_profiles").select("user_id, markets");
      userIdsToShow = (tradingProfiles || [])
        .filter((tp: any) => tp.markets?.includes(activeFilter))
        .map((tp: any) => tp.user_id);
    }

    // Always include self
    if (!userIdsToShow.includes(user.id)) userIdsToShow.push(user.id);

    if (userIdsToShow.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Fetch posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", userIdsToShow)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = postsData.map((p: any) => p.id);
    const authorIds = [...new Set(postsData.map((p: any) => p.user_id))];

    // Parallel fetches
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
  }, [marketFilter]);

  useEffect(() => {
    loadFeed();
    loadMarketCounts();

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
  }, []);

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
        const { data: myProf } = await supabase.from("profiles").select("full_name").eq("id", myId).single();
        await sendNotification({
          userId: post.user_id,
          type: "post_liked",
          title: `${myProf?.full_name || "Someone"} liked your post`,
          body: post.content?.slice(0, 50) || "Your post got a like",
          relatedUserId: myId,
          entryId: postId,
        });
      }
    }
  };

  const handleMarketFilter = (market: string) => {
    setMarketFilter(market);
    setShowFilterDropdown(false);
    setLoading(true);
    loadFeed(market);
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
        <div className="flex items-center justify-between px-5 pt-4 pb-2 sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
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

          <div className="flex items-center gap-2">
            {/* Market filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-[11px] font-semibold text-foreground"
              >
                {marketFilter === "All" ? "All" : marketFilter}
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  {MARKET_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => handleMarketFilter(m)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-xs transition-colors",
                        marketFilter === m ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span>{m}</span>
                      <span className="text-[10px] text-muted-foreground">{marketCounts[m] || 0} active</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <NotificationBell />
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-success/20 border border-primary/20 flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">Be the first to post in the {primaryMarket} community</p>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-5">Share your setup, your mindset, your journey</p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-success text-sm font-bold text-primary-foreground"
            >
              Create post
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <div key={post.id} className="px-5 py-4">
                {/* Post Header */}
                <div className="flex items-center gap-2.5 mb-3">
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
                      {/* Verified badge */}
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" fill="url(#vbf)" />
                        <path d="M6.5 10l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <defs><linearGradient id="vbf" x1="0" y1="0" x2="20" y2="20"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--success))" /></linearGradient></defs>
                      </svg>
                      {/* Market tag */}
                      {post.markets[0] && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{post.markets[0]}</span>
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Content - text */}
                {(post.content || post.caption) && (
                  <p className="text-[13px] text-foreground leading-relaxed mb-3">{post.content || post.caption}</p>
                )}

                {/* Post Media - image */}
                {(post.image_url || (post.media_url && post.media_type === "image")) && (
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="rounded-xl overflow-hidden mb-3 w-full block"
                  >
                    <img src={post.media_url || post.image_url!} alt="" className="w-full max-h-[500px] object-cover rounded-xl" />
                  </button>
                )}

                {/* Post Media - video */}
                {post.media_url && post.media_type === "video" && (
                  <div className="rounded-xl overflow-hidden mb-3">
                    <video src={post.media_url} controls className="w-full max-h-[500px] rounded-xl" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-5">
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

      <CreatePostModal open={showCreatePost} onClose={() => setShowCreatePost(false)} onCreated={loadFeed} />
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
