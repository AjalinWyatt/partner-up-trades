import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, MoreHorizontal, Link2, Eye, Globe, UserPlus, Trash2, PenSquare, Search, Menu, Repeat2, Send, Bookmark } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CreatePostModal from "@/components/CreatePostModal";
import NotificationBell from "@/components/NotificationBell";
import PostDetailModal from "@/components/PostDetailModal";
import FeedTopicsSheet from "@/components/FeedTopicsSheet";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import FeedCommentSheet from "@/components/FeedCommentSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import StoriesBar, { type StoryGroup, type StoryItem } from "@/components/feed/StoriesBar";
import CreateStoryDialog from "@/components/feed/CreateStoryDialog";
import StoryViewer from "@/components/feed/StoryViewer";
import lockup from "@/assets/tradersworld-lockup.png";
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
  media_urls?: string[] | null;
  media_type?: string | null;
  caption?: string | null;
  market?: string | null;
  tags?: string[] | null;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  markets: string[];
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  likeCount: number;
  commentCount: number;
}

interface ShareTarget {
  connectionId: string | null;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  type: "partner" | "dm";
}

interface StoryProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const Feed = () => {
  const { loading: guardLoading } = useOnboardingGuard();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [myMarkets, setMyMarkets] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(false);
  const [postToShare, setPostToShare] = useState<FeedPost | null>(null);
  const [shareTargets, setShareTargets] = useState<ShareTarget[]>([]);
  const [shareSearch, setShareSearch] = useState("");
  const [sendingToId, setSendingToId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<StoryProfileRow | null>(null);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  const loadStories = useCallback(async (userId: string) => {
    const { data: storyRows, error: storiesError } = await supabase
      .from("stories" as any)
      .select("id, user_id, media_url, media_type, caption, created_at, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (storiesError || !storyRows?.length) {
      setStoryGroups([]);
      return;
    }

    const profileIds = [...new Set((storyRows as any[]).map((row) => row.user_id))];
    const storyIds = (storyRows as any[]).map((row) => row.id);
    const [{ data: profileRows }, { data: viewRows }] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", profileIds),
      supabase.from("story_views" as any).select("story_id").eq("viewer_id", userId).in("story_id", storyIds),
    ]);

    const viewedIds = new Set(((viewRows as any[]) || []).map((row) => row.story_id));
    setViewedStoryIds([...viewedIds]);
    const profileMap = new Map((profileRows || []).map((row: any) => [row.id, row as StoryProfileRow]));
    const groupsMap = new Map<string, StoryGroup>();

    (storyRows as any[]).forEach((row) => {
      const profile = profileMap.get(row.user_id);
      const story: StoryItem = {
        id: row.id,
        userId: row.user_id,
        mediaUrl: row.media_url,
        mediaType: row.media_type,
        caption: row.caption,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      };

      const existing = groupsMap.get(row.user_id);
      if (existing) {
        existing.stories.push(story);
        existing.viewed = existing.viewed && viewedIds.has(row.id);
        return;
      }

      groupsMap.set(row.user_id, {
        userId: row.user_id,
        username: profile?.username ? `@${profile.username}` : "@trader",
        fullName: profile?.full_name || "Trader",
        avatarUrl: profile?.avatar_url || null,
        viewed: viewedIds.has(row.id),
        isOwn: row.user_id === userId,
        latestCreatedAt: row.created_at,
        stories: [story],
      });
    });

    const groups = [...groupsMap.values()]
      .map((group) => ({
        ...group,
        stories: group.stories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      }))
      .sort((a, b) => {
        if (a.isOwn && !b.isOwn) return -1;
        if (!a.isOwn && b.isOwn) return 1;
        if (a.viewed !== b.viewed) return a.viewed ? 1 : -1;
        return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
      });

    setStoryGroups(groups);
  }, []);

  const loadFeed = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    setMyId(user.id);

    const [{ data: myTp }, { data: myProfileRow }] = await Promise.all([
      supabase.from("trading_profiles").select("markets").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", user.id).maybeSingle(),
    ]);
    const userMarkets = myTp?.markets || [];
    setMyMarkets(userMarkets);
    setMyProfile(myProfileRow || null);
    await loadStories(user.id);

    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (userMarkets.length > 0) {
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

    const [profilesRes, likesRes, myLikesRes, commentsRes, tradingRes, savedRes, repostedRes] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", authorIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id),
      supabase.from("comments").select("post_id").in("post_id", postIds),
      supabase.from("trading_profiles").select("user_id, markets").in("user_id", authorIds),
      supabase.from("saved_posts" as any).select("post_id").in("post_id", postIds).eq("user_id", user.id),
      supabase.from("post_reposts" as any).select("post_id").in("post_id", postIds).eq("user_id", user.id),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const tradingMap = new Map((tradingRes.data || []).map((t: any) => [t.user_id, t]));

    const likeCounts: Record<string, number> = {};
    (likesRes.data || []).forEach((l: any) => {
      likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
    });
    const myLikedSet = new Set((myLikesRes.data || []).map((l: any) => l.post_id));
    const mySavedSet = new Set((savedRes.data || []).map((s: any) => s.post_id));
    const myRepostedSet = new Set((repostedRes.data || []).map((r: any) => r.post_id));
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
        media_urls: p.media_urls || (p.media_url ? [p.media_url] : []),
        media_type: p.media_type,
        caption: p.caption,
        market: p.market,
        tags: p.tags || [],
        created_at: p.created_at,
        username: prof?.username || "trader",
        full_name: prof?.full_name || "Trader",
        avatar_url: prof?.avatar_url || null,
        markets: tp?.markets || [],
        liked: myLikedSet.has(p.id),
        saved: mySavedSet.has(p.id),
        reposted: myRepostedSet.has(p.id),
        likeCount: likeCounts[p.id] || 0,
        commentCount: commentCounts[p.id] || 0,
      };
    });

    setPosts(feedItems);
    setLoading(false);
  }, [loadStories]);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        if (myId) loadStories(myId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadFeed, loadStories, myId]);

  const allStoryGroups = useMemo(() => storyGroups, [storyGroups]);
  const ownStoryGroup = useMemo(() => allStoryGroups.find((group) => group.isOwn) || null, [allStoryGroups]);
  const otherStoryGroups = useMemo(() => allStoryGroups.filter((group) => !group.isOwn), [allStoryGroups]);
  const activeStoryGroup = activeStoryGroupIndex !== null ? allStoryGroups[activeStoryGroupIndex] || null : null;

  const markStorySeen = useCallback(async (story: StoryItem) => {
    if (!myId || story.userId === myId) return;
    await supabase.from("story_views" as any).upsert({ story_id: story.id, viewer_id: myId }, { onConflict: "story_id,viewer_id" });
    setViewedStoryIds((current) => {
      if (current.includes(story.id)) return current;
      const next = [...current, story.id];
      setStoryGroups((groups) =>
        groups.map((group) => {
          if (group.userId !== story.userId) return group;
          return {
            ...group,
            viewed: group.stories.every((item) => next.includes(item.id)),
          };
        })
      );
      return next;
    });
  }, [myId]);

  useEffect(() => {
    if (!activeStoryGroup) return;
    const story = activeStoryGroup.stories[activeStoryIndex];
    if (!story) return;
    markStorySeen(story);
  }, [activeStoryGroup, activeStoryIndex, markStorySeen]);

  const openStoryGroup = (groupIndex: number) => {
    setActiveStoryGroupIndex(groupIndex);
    setActiveStoryIndex(0);
  };

  const closeStoryViewer = () => {
    setActiveStoryGroupIndex(null);
    setActiveStoryIndex(0);
  };

  const handleNextStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
      setActiveStoryIndex((current) => current + 1);
      return;
    }
    if (activeStoryGroupIndex === null || activeStoryGroupIndex >= allStoryGroups.length - 1) {
      closeStoryViewer();
      return;
    }
    setActiveStoryGroupIndex((current) => (current === null ? current : current + 1));
    setActiveStoryIndex(0);
  };

  const handlePrevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((current) => current - 1);
      return;
    }
    if (activeStoryGroupIndex === null || activeStoryGroupIndex === 0) return;
    const previousGroup = allStoryGroups[activeStoryGroupIndex - 1];
    setActiveStoryGroupIndex(activeStoryGroupIndex - 1);
    setActiveStoryIndex(Math.max(0, previousGroup.stories.length - 1));
  };

  const loadShareTargets = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const [{ data: partnerRows }, { data: dmRows }] = await Promise.all([
      supabase
        .from("partner_connections")
        .select("id, requester_id, receiver_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`),
      supabase
        .from("messages")
        .select("connection_id, sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const targetMap = new Map<string, ShareTarget>();

    (partnerRows || []).forEach((row: any) => {
      const partnerId = row.requester_id === user.id ? row.receiver_id : row.requester_id;
      targetMap.set(partnerId, {
        connectionId: row.id,
        userId: partnerId,
        username: "",
        fullName: "",
        avatarUrl: null,
        type: "partner",
      });
    });

    (dmRows || []).forEach((row: any) => {
      const otherId = row.sender_id === user.id ? row.receiver_id : row.sender_id;
      if (!otherId || otherId === user.id) return;
      const current = targetMap.get(otherId);
      targetMap.set(otherId, {
        connectionId: current?.connectionId || row.connection_id || null,
        userId: otherId,
        username: current?.username || "",
        fullName: current?.fullName || "",
        avatarUrl: current?.avatarUrl || null,
        type: current?.type || "dm",
      });
    });

    const ids = [...targetMap.keys()];
    if (ids.length === 0) {
      setShareTargets([]);
      return;
    }

    const { data: profiles } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids);
    const profileMap = new Map((profiles || []).map((entry: any) => [entry.id, entry]));

    setShareTargets(
      ids.map((id) => {
        const base = targetMap.get(id)!;
        const profile = profileMap.get(id);
        return {
          ...base,
          username: profile?.username ? `@${profile.username}` : "@trader",
          fullName: profile?.full_name || "Trader",
          avatarUrl: profile?.avatar_url || null,
        };
      })
    );
  }, []);

  useEffect(() => {
    if (postToShare) loadShareTargets();
  }, [postToShare, loadShareTargets]);

  const filteredShareTargets = useMemo(() => {
    const query = shareSearch.trim().toLowerCase();
    if (!query) return shareTargets;
    return shareTargets.filter((target) =>
      target.username.toLowerCase().includes(query) || target.fullName.toLowerCase().includes(query)
    );
  }, [shareSearch, shareTargets]);

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

  const toggleSave = async (postId: string) => {
    if (!myId) return;
    const post = posts.find((entry) => entry.id === postId);
    if (!post) return;

    if (post.saved) {
      const { error } = await supabase.from("saved_posts" as any).delete().eq("user_id", myId).eq("post_id", postId);
      if (error) {
        toast.error("Could not remove saved post");
        return;
      }
      setPosts((prev) => prev.map((entry) => (entry.id === postId ? { ...entry, saved: false } : entry)));
      return;
    }

    const { error } = await supabase.from("saved_posts" as any).insert({ user_id: myId, post_id: postId });
    if (error) {
      toast.error("Could not save post");
      return;
    }
    setPosts((prev) => prev.map((entry) => (entry.id === postId ? { ...entry, saved: true } : entry)));
    toast.success("Post saved");
  };

  const toggleRepost = async (postId: string) => {
    if (!myId) return;
    const post = posts.find((entry) => entry.id === postId);
    if (!post) return;

    if (post.reposted) {
      const { error } = await supabase.from("post_reposts" as any).delete().eq("user_id", myId).eq("post_id", postId);
      if (error) {
        toast.error("Could not remove repost");
        return;
      }
      setPosts((prev) => prev.map((entry) => (entry.id === postId ? { ...entry, reposted: false } : entry)));
      return;
    }

    const { error } = await supabase.from("post_reposts" as any).insert({ user_id: myId, post_id: postId });
    if (error) {
      toast.error("Could not repost");
      return;
    }
    setPosts((prev) => prev.map((entry) => (entry.id === postId ? { ...entry, reposted: true } : entry)));
    toast.success("Reposted");
  };

  const sendPostToTarget = async (target: ShareTarget) => {
    if (!myId || !postToShare) return;
    setSendingToId(target.userId);

    const preview = [postToShare.content || postToShare.caption, postToShare.market ? `[${postToShare.market}]` : null].filter(Boolean).join(" ").slice(0, 140);
    const messageText = `Shared a post from ${postToShare.username}${preview ? `\n${preview}` : ""}`;

    const { error } = await supabase.from("messages").insert({
      sender_id: myId,
      receiver_id: target.userId,
      connection_id: target.connectionId,
      content: messageText,
      media_url: postToShare.media_urls?.[0] || postToShare.media_url || postToShare.image_url || null,
      media_type: postToShare.media_type || (postToShare.media_urls?.length || postToShare.media_url || postToShare.image_url ? "image" : null),
    } as any);

    if (error) {
      toast.error("Could not send post");
      setSendingToId(null);
      return;
    }

    setSendingToId(null);
    setPostToShare(null);
    setShareSearch("");
    toast.success(`Sent to ${target.username}`);
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
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button onClick={() => setShowTopics(true)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted">
              <Menu className="h-3.5 w-3.5" />
            </button>

            <img src={lockup} alt="TradersWorld" className="h-5 w-auto" loading="eager" />

            <div className="flex items-center gap-2">
              <button onClick={() => setShowTopics(true)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted">
                <Search className="h-3.5 w-3.5" />
              </button>
              <NotificationBell />
            </div>
          </div>
        </div>

        <StoriesBar
          groups={otherStoryGroups}
          ownGroup={ownStoryGroup}
          myAvatarUrl={myProfile?.avatar_url || null}
          myName={myProfile?.full_name || myProfile?.username || "You"}
          onAddStory={() => setShowCreateStory(true)}
          onOpenStory={openStoryGroup}
        />

        <div className="border-b border-border px-4 py-2.5">
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex w-full items-center gap-3 text-left transition-colors hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-success/20 text-xs font-black text-primary">
              {primaryMarket.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-muted-foreground">Share a thought, chart, recap, or setup</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-foreground">
              <PenSquare className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-success/20 border border-primary/20 flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-primary" />
            </div>
            <p className="mb-1 text-sm font-bold text-foreground">No posts in your markets yet</p>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-5">Share your setup, your mindset, your journey, or a quick update.</p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-success text-sm font-bold text-primary-foreground"
            >
              Create post
            </button>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
                <div key={post.id} className="border-b border-border px-4 py-3">
                {/* Post Header */}
                  <div className="flex items-start gap-2.5">
                  <button onClick={() => navigate(`/profile/${post.user_id}`)}>
                    {post.avatar_url ? (
                        <img src={post.avatar_url} className="h-8.5 w-8.5 rounded-full object-cover" />
                    ) : (
                        <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-black text-primary-foreground">
                        {getInitials(post.full_name)}
                      </div>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => navigate(`/profile/${post.user_id}`)} className="text-xs font-bold text-foreground hover:underline">
                        {post.username}
                      </button>
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" fill="url(#vbf)" />
                        <path d="M6.5 10l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <defs><linearGradient id="vbf" x1="0" y1="0" x2="20" y2="20"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--success))" /></linearGradient></defs>
                      </svg>
                      {/* Market tag from post */}
                      {(post.market || post.markets[0]) && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary">
                          {post.market || post.markets[0]}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                    </div>

                    {(post.content || post.caption) && (
                        <div className="pt-1">
                          <p className="whitespace-pre-wrap text-[13px] leading-6 text-foreground">{post.content || post.caption}</p>
                      </div>
                    )}

                    {!!post.tags?.length && (
                        <div className="flex flex-wrap gap-1.5 pt-2.5">
                        {post.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {!!post.media_urls?.length && (
                        <button onClick={() => setSelectedPost(post)} className="mt-2.5 block w-full overflow-hidden rounded-xl border border-border bg-muted">
                        {post.media_urls.length === 1 ? (
                          <img src={post.media_urls[0]} alt="" className="aspect-[4/5] w-full object-cover" />
                        ) : (
                          <Carousel opts={{ loop: true }} className="w-full">
                            <CarouselContent className="ml-0">
                              {post.media_urls.map((url) => (
                                <CarouselItem key={url} className="pl-0">
                                  <img src={url} alt="" className="aspect-[4/5] w-full object-cover" />
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                          </Carousel>
                        )}
                      </button>
                    )}

                      <div className="flex items-center gap-4 pt-2.5">
                      <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 group">
                          <Heart className={cn("h-4 w-4 transition-colors", post.liked ? "fill-destructive text-destructive" : "text-muted-foreground group-hover:text-foreground")} />
                        {post.likeCount > 0 && <span className="text-[11px] text-muted-foreground">{post.likeCount}</span>}
                      </button>
                      <button onClick={() => setCommentPostId(post.id)} className="flex items-center gap-1.5 group">
                          <MessageCircle className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                        {post.commentCount > 0 && <span className="text-[11px] text-muted-foreground">{post.commentCount}</span>}
                      </button>
                        <button onClick={() => toggleRepost(post.id)} className="group">
                          <Repeat2 className={cn("h-4 w-4 transition-colors", post.reposted ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        </button>
                        <button onClick={() => setPostToShare(post)} className="group">
                          <Send className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                        </button>
                        <button onClick={() => toggleSave(post.id)} className="group ml-auto">
                          <Bookmark className={cn("h-4 w-4 transition-colors", post.saved ? "fill-primary text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        </button>
                    </div>
                  </div>

                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
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
              </div>
            ))}
          </div>
        )}
      </div>

      <CreatePostModal open={showCreatePost} onClose={() => setShowCreatePost(false)} onCreated={() => loadFeed()} />
      <FeedTopicsSheet open={showTopics} onClose={() => setShowTopics(false)} currentMarket={primaryMarket} />
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
      <CreateStoryDialog open={showCreateStory} onClose={() => setShowCreateStory(false)} onCreated={() => loadFeed()} />
      <StoryViewer
        open={activeStoryGroupIndex !== null}
        group={activeStoryGroup}
        storyIndex={activeStoryIndex}
        onClose={closeStoryViewer}
        onNext={handleNextStory}
        onPrev={handlePrevStory}
      />
      <Dialog open={!!postToShare} onOpenChange={(open) => { if (!open) { setPostToShare(null); setShareSearch(""); } }}>
        <DialogContent className="border-border bg-card p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle className="text-sm font-bold text-foreground">Send post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-4 py-4">
            <Input
              value={shareSearch}
              onChange={(event) => setShareSearch(event.target.value)}
              placeholder="Search partners or chats"
              className="h-9 rounded-xl border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground"
            />

            {filteredShareTargets.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No partners or DM chats yet.</p>
            ) : (
              <div className="max-h-[420px] space-y-1 overflow-y-auto">
                {filteredShareTargets.map((target) => (
                  <button
                    key={target.userId}
                    onClick={() => sendPostToTarget(target)}
                    disabled={sendingToId === target.userId}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-secondary">
                      {target.avatarUrl ? (
                        <img src={target.avatarUrl} alt={target.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">
                          {getInitials(target.fullName || target.username)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{target.username}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {target.type === "partner" ? "Partner" : "Direct message"}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {sendingToId === target.userId ? "Sending..." : "Send"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Feed;
