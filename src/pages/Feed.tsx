import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, MoreHorizontal, Link2, Eye, UserPlus, Trash2, Plus, PenSquare, Repeat2, Send, Bookmark, Sparkles, ArrowUpRight, Activity, MessageSquare, Mic, Coffee } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CreatePostModal from "@/components/CreatePostModal";
import PostDetailModal from "@/components/PostDetailModal";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import FeedCommentSheet from "@/components/FeedCommentSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { StoryGroup, StoryItem } from "@/components/feed/StoriesBar";
import CreateStoryDialog from "@/components/feed/CreateStoryDialog";
import StoryViewer from "@/components/feed/StoryViewer";
import Wordmark from "@/components/Wordmark";
import pulseGlobe from "@/assets/pulse-globe.svg";
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
  experienceLevel: string | null;
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

const FEED_FILTERS = ["All", "Crypto", "Forex", "Indices", "Futures", "Options", "Commodities"] as const;
const FEED_MODES = ["Feed", "Pulse"] as const;

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
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
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
  const [activeMode, setActiveMode] = useState<(typeof FEED_MODES)[number]>("Feed");
  const [selectedFeedFilter, setSelectedFeedFilter] = useState<(typeof FEED_FILTERS)[number]>("All");
  const [pulseTab, setPulseTab] = useState<"Market" | "Connect">("Market");
  const [availableToConnect, setAvailableToConnect] = useState(false);
  const [supportContext, setSupportContext] = useState<string[]>([]);
  const [needHelpOpen, setNeedHelpOpen] = useState(false);
  const [insightFor, setInsightFor] = useState<string | null>(null);
  // Live count of registered traders. No mock data.
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<
    {
      id: string;
      userId: string;
      name: string;
      username: string;
      avatarUrl: string | null;
      context: string[];
      note?: string;
      ago: string;
      insight: { experience: string; markets: string[]; style: string; bio: string };
    }[]
  >([]);

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
      supabase.from("trading_profiles").select("user_id, markets, experience_level").in("user_id", authorIds),
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
        experienceLevel: tp?.experience_level || null,
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

  // Fetch real trader count for the Pulse globe (no mock data).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (!cancelled) setOnlineCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, []);

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

  const pulseHasNew = useMemo(
    () => allStoryGroups.some((group) => !group.isOwn && !group.viewed),
    [allStoryGroups]
  );

  const visiblePosts = useMemo(() => {
    if (selectedFeedFilter === "All") return posts;

    return posts.filter((post) => {
      const postTags = (post.tags || []).map((tag) => tag.trim().toLowerCase());
      return [post.market, ...post.tags || []]
        .filter(Boolean)
        .some((value) => value!.toString().trim().toLowerCase() === selectedFeedFilter.toLowerCase()) || postTags.includes(selectedFeedFilter.toLowerCase());
    });
  }, [posts, selectedFeedFilter]);

  const pulseRows = useMemo(
    () => allStoryGroups.map((group, index) => ({
      group,
      index,
      latestStory: group.stories[group.stories.length - 1],
    })),
    [allStoryGroups]
  );

  // Filter chips drive the visible feed directly - no auto-reset based on user markets.

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
    <AppLayout hideBottomNav={!!commentPostId}>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="sticky top-0 z-30 border-b border-border bg-background/96 backdrop-blur-xl">
          <div className="space-y-4 px-4 pb-4 pt-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div />
              <Wordmark size="text-lg" />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => activeMode === "Feed" ? setShowCreatePost(true) : setShowCreateStory(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted"
                  aria-label={activeMode === "Feed" ? "Create post" : "Create pulse"}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted"
                  aria-label="Open my profile"
                >
                  {myProfile?.avatar_url ? (
                    <img src={myProfile.avatar_url} alt="My profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold">{getInitials(myProfile?.full_name || myProfile?.username || "Me")}</span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="grid h-10 w-full max-w-[260px] grid-cols-2 rounded-full border border-border bg-card p-1 shadow-[inset_0_1px_0_hsl(var(--border))]">
                {FEED_MODES.map((mode) => {
                  const active = activeMode === mode;
                  const isPulse = mode === "Pulse";
                  return (
                    <button
                      key={mode}
                      onClick={() => setActiveMode(mode)}
                      className={cn(
                        "relative rounded-full text-sm font-medium transition-all",
                        active ? "bg-secondary text-foreground shadow-[0_0_18px_hsl(var(--primary)/0.12)]" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {mode}
                        {isPulse && pulseHasNew && !active && <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeMode === "Feed" && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {FEED_FILTERS.map((filter) => {
                  const active = selectedFeedFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setSelectedFeedFilter(filter)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                        active
                          ? "border-primary bg-primary/10 text-foreground shadow-[0_0_18px_hsl(var(--primary)/0.16)]"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {activeMode === "Pulse" ? (
          <div className="space-y-3 px-4 py-3">
            {/* Pulse hero header */}
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-[0_24px_60px_hsl(var(--background)/0.45)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">PULSE</p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">Real-time peer connection with traders online right now.</p>
            </div>

            {/* Centered globe with live trader count below it */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative">
                {/* soft pulsing glow ring */}
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse-dot"
                />
                <img
                  src={pulseGlobe}
                  alt="Live trader globe"
                  className="relative h-24 w-24 opacity-95 drop-shadow-[0_0_24px_hsl(var(--primary)/0.45)] animate-globe-float"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse-dot" />
                <span className="text-[15px] font-bold leading-none text-foreground tabular-nums">
                  {onlineCount === null ? "-" : onlineCount.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                  {onlineCount === 1 ? "Trader" : "Traders"}
                </span>
              </div>
            </div>

            {/* REQUESTER card - for traders who need someone right now */}
            <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-[0_24px_60px_hsl(var(--background)/0.45)]">
              {/* Header row with toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.3)]">
                    <Activity className="h-4 w-4 animate-pulse-dot" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Need Help</p>
                    <p className="text-[13px] font-semibold text-foreground">I need someone right now</p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={needHelpOpen}
                  onClick={() => setNeedHelpOpen((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
                    needHelpOpen ? "border-primary bg-primary/30" : "border-border bg-secondary"
                  )}
                >
                  <span className={cn(
                    "absolute top-1/2 left-0.5 h-4 w-4 -translate-y-1/2 rounded-full transition-transform",
                    needHelpOpen ? "translate-x-[22px] bg-primary shadow-[0_0_10px_hsl(var(--primary))]" : "translate-x-0 bg-foreground"
                  )} />
                </button>
              </div>

              {needHelpOpen && (
                <>
                  <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
                    Send a Pulse to traders online. First one to answer connects with you privately.
                  </p>

                  {/* Context chips - what's going on, so helpers know before accepting */}
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                What's going on? <span className="font-normal normal-case tracking-normal text-destructive/80">(required)</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  "Bad Loss",
                  "Revenge Trading",
                  "Anxiety",
                  "Need Perspective",
                  "Lonely Journey",
                  "Pre-Trade Check",
                  "Just Need to Talk",
                ].map((chip) => {
                  const on = supportContext.includes(chip);
                  return (
                    <button
                      key={chip}
                      onClick={() =>
                        setSupportContext((prev) =>
                          prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
                        )
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                        on
                          ? "border-primary bg-primary/15 text-foreground shadow-[0_0_14px_hsl(var(--primary)/0.25)]"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>

                  {/* Action buttons - Chat or Voice */}
                  {/* Single Send Pulse - sessions support both chat + voice notes */}
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        if (supportContext.length === 0) {
                          toast.error("Tap what you need help with first so a trader knows how to show up for you.");
                          return;
                        }
                        toast.success("Pulse sent - waiting for a trader to answer…");
                      import("@/lib/analytics").then(({ trackEvent }) => trackEvent("pulse_request_sent", { context: supportContext }));
                        setSupportContext([]);
                        setNeedHelpOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-transform active:scale-[0.98]"
                    >
                      <Activity className="h-4 w-4" /> Send Pulse
                    </button>
                    <p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">
                      Sessions include chat + voice notes. No live calls.
                    </p>
                  </div>

                  <p className="mt-3 text-center text-[11px] leading-4 text-muted-foreground">
                    First trader to accept gets you. Others see "This Pulse has already been answered."
                  </p>
                </>
              )}
            </div>

            {/* HELPER card - for traders willing to be there for someone */}
            <div className="rounded-2xl border border-primary/30 bg-card px-4 py-4 shadow-[0_24px_60px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10 [background-image:linear-gradient(180deg,hsl(var(--primary)/0.06),transparent_60%)]">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="h-px flex-1 bg-primary/20" />
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Help Others
                </span>
                <span className="h-px flex-1 bg-primary/20" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      availableToConnect ? "bg-primary shadow-[0_0_10px_hsl(var(--primary))] animate-pulse-dot" : "bg-muted-foreground/40"
                    )} />
                    <p className="text-[13px] font-semibold text-foreground">Available to Help</p>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    {availableToConnect ? "You'll see Pulses from traders who need someone." : "Turn on to receive live Pulse requests."}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={availableToConnect}
                  onClick={() => {
                    const next = !availableToConnect;
                    setAvailableToConnect(next);
                    toast.success(next ? "You're online to help." : "You're offline.");
                  }}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
                    availableToConnect ? "border-primary bg-primary/30" : "border-border bg-secondary"
                  )}
                >
                  <span className={cn(
                    "absolute top-1/2 left-0.5 h-4 w-4 -translate-y-1/2 rounded-full transition-transform",
                    availableToConnect ? "translate-x-[22px] bg-primary shadow-[0_0_10px_hsl(var(--primary))]" : "translate-x-0 bg-foreground"
                  )} />
                </button>
              </div>

              {availableToConnect && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Incoming Pulses</p>
                    <span className="text-[11px] font-medium text-muted-foreground">{incomingRequests.length} waiting</span>
                  </div>

                  {incomingRequests.length === 0 ? (
                    <p className="mt-3 text-center text-[12px] leading-5 text-muted-foreground">
                      All quiet for now. You'll see Pulses here as traders reach out.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {incomingRequests.map((req) => {
                        return (
                          <li
                            key={req.id}
                            className="rounded-xl border border-border bg-secondary/60 px-3 py-3"
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => setInsightFor(insightFor === req.id ? null : req.id)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[11px] font-semibold text-foreground"
                                aria-label={`See ${req.name}'s insight`}
                              >
                                {req.avatarUrl ? (
                                  <img src={req.avatarUrl} alt={req.name} className="h-full w-full rounded-full object-cover" />
                                ) : (
                                  getInitials(req.name)
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setInsightFor(insightFor === req.id ? null : req.id)}
                                    className="truncate text-[13px] font-semibold text-foreground hover:opacity-80"
                                  >
                                    {req.name}
                                  </button>
                                  <span className="text-[10px] text-muted-foreground">· {req.ago}</span>
                                </div>
                                {req.context.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {req.context.map((c) => (
                                      <span
                                        key={c}
                                        className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-foreground"
                                      >
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {req.note && (
                                  <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">"{req.note}"</p>
                                )}
                              </div>
                            </div>

                            {/* Inline insight panel - stays inside Pulse */}
                            {insightFor === req.id && (
                              <div className="mt-3 rounded-xl border border-primary/30 bg-card px-3 py-3 shadow-[0_0_18px_hsl(var(--primary)/0.12)]">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Trader insight</p>
                                  <button
                                    onClick={() => setInsightFor(null)}
                                    aria-label="Close insight"
                                    className="-mt-1 -mr-1 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <dl className="mt-2 space-y-1.5 text-[11px] leading-4">
                                  <div className="flex gap-2">
                                    <dt className="w-20 shrink-0 text-muted-foreground">Experience</dt>
                                    <dd className="text-foreground">{req.insight.experience}</dd>
                                  </div>
                                  <div className="flex gap-2">
                                    <dt className="w-20 shrink-0 text-muted-foreground">Markets</dt>
                                    <dd className="text-foreground">{req.insight.markets.join(", ")}</dd>
                                  </div>
                                  <div className="flex gap-2">
                                    <dt className="w-20 shrink-0 text-muted-foreground">Style</dt>
                                    <dd className="text-foreground">{req.insight.style}</dd>
                                  </div>
                                  <div className="flex gap-2">
                                    <dt className="w-20 shrink-0 text-muted-foreground">About</dt>
                                    <dd className="text-muted-foreground">{req.insight.bio}</dd>
                                  </div>
                                </dl>
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-1.5">
                              <button
                                onClick={() => setInsightFor(insightFor === req.id ? null : req.id)}
                                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                              >
                                {insightFor === req.id ? "Hide insight" : "Insight"}
                              </button>
                              <div className="ml-auto flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
                                    if (insightFor === req.id) setInsightFor(null);
                                  }}
                                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                                >
                                  Pass
                                </button>
                                <button
                                  onClick={() => {
                                    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
                                    if (insightFor === req.id) setInsightFor(null);
                                    // Per spec: helper's availability auto-turns OFF after accepting.
                                    setAvailableToConnect(false);
                                    toast.success(`Connected with ${req.name} - opening Pulse session.`);
                                    import("@/lib/analytics").then(({ trackEvent }) => trackEvent("pulse_request_accepted", { request_id: req.id }));
                                    navigate(`/pulse/session/${req.id}`);
                                  }}
                                  className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
                                >
                                  Accept
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">
                    First to accept connects. Others see "This Pulse has already been answered."
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
            <img src={pulseGlobe} alt="" aria-hidden="true" className="h-16 w-16 opacity-90 drop-shadow-[0_0_18px_hsl(var(--primary)/0.45)]" />
            <p className="mt-4 text-sm font-semibold text-foreground">No {selectedFeedFilter === "All" ? "posts" : `${selectedFeedFilter} posts`} yet</p>
            <p className="mt-1 max-w-[280px] text-xs leading-5 text-muted-foreground">Post a chart, idea, meme, question, or recap to start shaping the conversation.</p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.22)]"
            >
              Create post
            </button>
          </div>
        ) : (
          <div className="space-y-3 px-4 py-4">
            {visiblePosts.map((post) => (
              <article key={post.id} className="overflow-hidden rounded-[22px] border border-border bg-card/90 shadow-[0_10px_30px_hsl(var(--background)/0.22)]">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                     <button onClick={() => navigate(post.user_id === myId ? "/profile" : `/profile/${post.user_id}`)} className="shrink-0">
                      {post.avatar_url ? (
                        <img src={post.avatar_url} alt={post.full_name} className="h-10 w-10 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-xs font-semibold text-foreground">
                          {getInitials(post.full_name)}
                        </div>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(post.user_id === myId ? "/profile" : `/profile/${post.user_id}`)} className="truncate text-sm font-semibold text-foreground hover:opacity-80">
                          @{post.username.replace(/^@+/, "")}
                        </button>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                      </div>
                      {(post.market || post.experienceLevel) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {post.market && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {post.market}
                            </span>
                          )}
                          {post.experienceLevel && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {post.experienceLevel}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-3 space-y-3">
                        {(post.content || post.caption) && <p className="whitespace-pre-wrap text-[14px] leading-6 text-foreground">{post.content || post.caption}</p>}

                        {!!post.media_urls?.length && (
                          <button onClick={() => setSelectedPost(post)} className="block w-full overflow-hidden rounded-[20px] border border-border bg-muted">
                            {post.media_urls.length === 1 ? (
                              <img src={post.media_urls[0]} alt="Post media" className="aspect-[4/5] w-full object-cover" />
                            ) : (
                              <Carousel opts={{ loop: true }} className="w-full">
                                <CarouselContent className="ml-0">
                                  {post.media_urls.map((url) => (
                                    <CarouselItem key={url} className="pl-0">
                                      <img src={url} alt="Post media" className="aspect-[4/5] w-full object-cover" />
                                    </CarouselItem>
                                  ))}
                                </CarouselContent>
                              </Carousel>
                            )}
                          </button>
                        )}

                        {!!post.tags?.length && (
                          <div className="flex flex-wrap gap-1.5">
                            {post.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                #{tag.replace(/^#/, "")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-5 border-t border-border pt-3 text-muted-foreground">
                        <button onClick={() => toggleLike(post.id)} aria-label="Like" className="flex items-center gap-1 transition-colors hover:text-foreground">
                          <Heart className={cn("h-[18px] w-[18px]", post.liked ? "fill-destructive text-destructive" : "")} />
                          {post.likeCount > 0 && <span className="text-[11px] tabular-nums">{post.likeCount}</span>}
                        </button>
                        <button onClick={() => setCommentPostId(post.id)} aria-label="Comment" className="flex items-center gap-1 transition-colors hover:text-foreground">
                          <MessageCircle className="h-[18px] w-[18px]" />
                          {post.commentCount > 0 && <span className="text-[11px] tabular-nums">{post.commentCount}</span>}
                        </button>
                        <button onClick={() => setPostToShare(post)} aria-label="Share" className="transition-colors hover:text-foreground">
                          <Send className="h-[18px] w-[18px]" />
                        </button>
                        <button onClick={() => toggleSave(post.id)} aria-label="Save" className="ml-auto transition-colors hover:text-foreground">
                          <Bookmark className={cn("h-[18px] w-[18px]", post.saved ? "fill-primary text-primary" : "")} />
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)} className="text-muted-foreground transition-colors hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuOpen === post.id && (
                        <div className="absolute right-0 top-7 z-50 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl">
                          <button
                            onClick={() => { navigate(`/profile/${post.user_id}`); setMenuOpen(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted"
                          >
                            <Eye className="h-4 w-4" /> View Profile
                          </button>
                          {post.user_id !== myId && (
                            <>
                              <button
                                onClick={() => { navigate(`/profile/${post.user_id}`); setMenuOpen(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted"
                              >
                                <Link2 className="h-4 w-4" /> Request Match
                              </button>
                              <button
                                onClick={() => setMenuOpen(null)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted"
                              >
                                <UserPlus className="h-4 w-4" /> Follow
                              </button>
                            </>
                          )}
                          {(isAdmin || post.user_id === myId) && (
                            <button
                              onClick={() => {
                                setEditingPost(post);
                                setShowCreatePost(true);
                                setMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted"
                            >
                              <PenSquare className="h-4 w-4" /> Edit Post
                            </button>
                          )}
                          {(isAdmin || post.user_id === myId) && (
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this post?")) return;
                                await supabase.from("posts").delete().eq("id", post.id);
                                setPosts((prev) => prev.filter((p) => p.id !== post.id));
                                setMenuOpen(null);
                                toast.success("Post deleted");
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" /> Delete Post
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <CreatePostModal
        open={showCreatePost}
        onClose={() => {
          setShowCreatePost(false);
          setEditingPost(null);
        }}
        onCreated={() => {
          setShowCreatePost(false);
          setEditingPost(null);
          loadFeed();
        }}
        initialPost={editingPost}
      />
      <PostDetailModal
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        myId={myId}
        onEdit={(post) => {
          setSelectedPost(null);
          setEditingPost(post as FeedPost);
          setShowCreatePost(true);
        }}
      />
      <FeedCommentSheet
        post={posts.find((entry) => entry.id === commentPostId) || null}
        myId={myId}
        onClose={() => setCommentPostId(null)}
        onCountChange={(postId, delta) => {
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + delta } : p));
        }}
        onToggleLike={toggleLike}
        onToggleSave={toggleSave}
        onToggleRepost={toggleRepost}
        onShare={() => {
          const post = posts.find((entry) => entry.id === commentPostId);
          if (post) setPostToShare(post);
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
