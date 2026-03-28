import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Heart, MessageCircle, ChevronLeft, Send, Trash2, ChevronDown } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/use-is-admin";

const FORUMS = ["Forex", "Futures", "Options"] as const;

interface ForumPost {
  id: string;
  user_id: string;
  forum: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
  username: string;
  avatar_url: string | null;
  liked: boolean;
}

interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
}

const Forums = () => {
  const { loading: guardLoading } = useOnboardingGuard();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeForum = searchParams.get("forum") || "Forex";
  const activePostId = searchParams.get("post") || null;

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [forumDropdownOpen, setForumDropdownOpen] = useState(false);

  // Thread view state
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Forum member counts
  const [forumCounts, setForumCounts] = useState<Record<string, number>>({});

  const loadPosts = useCallback(async (forum?: string) => {
    const f = forum || activeForum;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setMyId(user.id);

    const { data: postsData } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("forum", f)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set(postsData.map((p: any) => p.user_id))];
    const postIds = postsData.map((p: any) => p.id);

    const [profilesRes, myLikesRes] = await Promise.all([
      supabase.from("profiles").select("id, username, avatar_url").in("id", authorIds),
      supabase.from("forum_post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const myLikedSet = new Set((myLikesRes.data || []).map((l: any) => l.post_id));

    const items: ForumPost[] = postsData.map((p: any) => {
      const prof = profileMap.get(p.user_id);
      return {
        ...p,
        username: prof?.username || "trader",
        avatar_url: prof?.avatar_url || null,
        liked: myLikedSet.has(p.id),
      };
    });

    setPosts(items);
    setLoading(false);
  }, [activeForum]);

  const loadForumCounts = useCallback(async () => {
    const { data } = await supabase.from("trading_profiles").select("markets");
    const counts: Record<string, number> = { Forex: 0, Futures: 0, Options: 0 };
    (data || []).forEach((tp: any) => {
      (tp.markets || []).forEach((m: string) => {
        if (counts[m] !== undefined) counts[m]++;
      });
    });
    setForumCounts(counts);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadPosts();
    loadForumCounts();

    const channel = supabase
      .channel("forums-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_posts" }, () => loadPosts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load thread when activePostId changes
  useEffect(() => {
    if (!activePostId) { setActivePost(null); setReplies([]); return; }
    const loadThread = async () => {
      setLoadingReplies(true);
      const post = posts.find(p => p.id === activePostId);
      if (post) setActivePost(post);
      else {
        // Fetch the post
        const { data: p } = await supabase.from("forum_posts").select("*").eq("id", activePostId).maybeSingle();
        if (p) {
          const { data: prof } = await supabase.from("profiles").select("username, avatar_url").eq("id", p.user_id).maybeSingle();
          setActivePost({ ...p, username: prof?.username || "trader", avatar_url: prof?.avatar_url || null, liked: false });
        }
      }

      const { data: repliesData } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("post_id", activePostId)
        .order("created_at", { ascending: true });

      if (repliesData && repliesData.length > 0) {
        const authorIds = [...new Set(repliesData.map((r: any) => r.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", authorIds);
        const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        setReplies(repliesData.map((r: any) => {
          const prof = profMap.get(r.user_id);
          return { ...r, username: prof?.username || "trader", avatar_url: prof?.avatar_url || null };
        }));
      } else {
        setReplies([]);
      }
      setLoadingReplies(false);
    };
    loadThread();
  }, [activePostId, posts]);

  const switchForum = (f: string) => {
    setSearchParams({ forum: f });
    setForumDropdownOpen(false);
    setLoading(true);
    loadPosts(f);
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) { toast.error("Title and content are required"); return; }
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("forum_posts").insert({
        user_id: user.id,
        forum: activeForum,
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      if (error) throw error;
      toast.success("Posted!");
      setNewTitle("");
      setNewContent("");
      setShowCreate(false);
      loadPosts();
    } catch {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!myId) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.liked) {
      await supabase.from("forum_post_likes").delete().eq("user_id", myId).eq("post_id", postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: false, likes_count: Math.max(0, p.likes_count - 1) } : p));
      await supabase.from("forum_posts").update({ likes_count: Math.max(0, post.likes_count - 1) }).eq("id", postId);
    } else {
      await supabase.from("forum_post_likes").insert({ user_id: myId, post_id: postId });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: true, likes_count: p.likes_count + 1 } : p));
      await supabase.from("forum_posts").update({ likes_count: post.likes_count + 1 }).eq("id", postId);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !myId || !activePostId) return;
    try {
      const { error } = await supabase.from("forum_replies").insert({
        post_id: activePostId,
        user_id: myId,
        content: replyText.trim(),
      });
      if (error) throw error;
      // Update replies_count
      const currentPost = posts.find(p => p.id === activePostId);
      if (currentPost) {
        await supabase.from("forum_posts").update({ replies_count: currentPost.replies_count + 1 }).eq("id", activePostId);
        setPosts(prev => prev.map(p => p.id === activePostId ? { ...p, replies_count: p.replies_count + 1 } : p));
      }
      // Refetch replies
      const { data: prof } = await supabase.from("profiles").select("username, avatar_url").eq("id", myId).maybeSingle();
      setReplies(prev => [...prev, {
        id: crypto.randomUUID(),
        post_id: activePostId,
        user_id: myId,
        content: replyText.trim(),
        created_at: new Date().toISOString(),
        username: prof?.username || "trader",
        avatar_url: prof?.avatar_url || null,
      }]);
      setReplyText("");
    } catch {
      toast.error("Failed to reply");
    }
  };

  if (guardLoading) return null;

  // Thread view
  if (activePostId && activePost) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background pb-20">
          {/* Thread header */}
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSearchParams({ forum: activeForum })} className="text-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{activePost.title}</p>
              <p className="text-[10px] text-muted-foreground">{activePost.forum} Forum</p>
            </div>
          </div>

          {/* Original post */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5 mb-3">
              <button onClick={() => navigate(`/profile/${activePost.user_id}`)}>
                {activePost.avatar_url ? (
                  <img src={activePost.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-black text-primary-foreground">
                    {getInitials(activePost.username)}
                  </div>
                )}
              </button>
              <div className="flex-1">
                <button onClick={() => navigate(`/profile/${activePost.user_id}`)} className="text-[13px] font-bold text-foreground hover:underline">
                  @{activePost.username}
                </button>
                <span className="text-[10px] text-muted-foreground ml-2">{timeAgo(activePost.created_at)}</span>
              </div>
              {(isAdmin || myId === activePost.user_id) && (
                <button
                  onClick={async () => {
                    if (!confirm("Delete this post?")) return;
                    await supabase.from("forum_posts").delete().eq("id", activePost.id);
                    setSearchParams({ forum: activeForum });
                    loadPosts();
                    toast.success("Post deleted");
                  }}
                  className="text-destructive/70 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <h2 className="text-base font-bold text-foreground mb-2">{activePost.title}</h2>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{activePost.content}</p>
            <div className="flex items-center gap-5 mt-4">
              <button onClick={() => toggleLike(activePost.id)} className="flex items-center gap-1.5">
                <Heart className={cn("w-5 h-5", activePost.liked ? "fill-destructive text-destructive" : "text-muted-foreground")} />
                {activePost.likes_count > 0 && <span className="text-[11px] text-muted-foreground">{activePost.likes_count}</span>}
              </button>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageCircle className="w-5 h-5" />
                <span className="text-[11px]">{replies.length}</span>
              </div>
            </div>
          </div>

          {/* Replies */}
          <div className="px-5 py-3 space-y-3">
            {loadingReplies ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">No replies yet. Be the first!</p>
            ) : (
              replies.map(reply => (
                <div key={reply.id} className="flex gap-2.5">
                  <button onClick={() => navigate(`/profile/${reply.user_id}`)}>
                    {reply.avatar_url ? (
                      <img src={reply.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-black text-primary-foreground flex-shrink-0">
                        {getInitials(reply.username)}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 bg-card border border-border rounded-2xl px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <button onClick={() => navigate(`/profile/${reply.user_id}`)} className="text-[11px] font-bold text-foreground hover:underline">
                        @{reply.username}
                      </button>
                      <span className="text-[9px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">{reply.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply input */}
          <div className="px-5 py-3 flex gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleReply()}
              placeholder="Write a reply..."
              className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="w-8 h-8 rounded-xl bg-gradient-to-r from-primary to-success flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-5 py-3 flex items-center justify-between">
          <button onClick={() => setShowCreate(true)} className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-success flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>

          {/* Forum selector */}
          <div className="relative">
            <button
              onClick={() => setForumDropdownOpen(!forumDropdownOpen)}
              className="flex items-center gap-1.5"
            >
              <span className="text-sm font-black text-foreground">{activeForum} Forum</span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", forumDropdownOpen && "rotate-180")} />
            </button>
            {forumDropdownOpen && (
              <div className="absolute right-0 top-9 w-56 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                {FORUMS.map(f => (
                  <button
                    key={f}
                    onClick={() => switchForum(f)}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-3 text-sm transition-colors",
                      activeForum === f ? "text-primary font-bold bg-primary/5" : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{f}</span>
                    <span className="text-[10px] text-muted-foreground">{forumCounts[f] || 0} traders</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <NotificationBell />
        </div>

        {/* Create post modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-20" onClick={() => setShowCreate(false)}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <button onClick={() => setShowCreate(false)} className="text-muted-foreground text-sm">Cancel</button>
                <span className="text-sm font-bold text-foreground">{activeForum} Forum</span>
                <button
                  onClick={handleCreatePost}
                  disabled={posting || !newTitle.trim() || !newContent.trim()}
                  className="text-sm font-bold text-primary disabled:opacity-40"
                >
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
              <div className="p-4 space-y-3">
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Thread title..."
                  maxLength={150}
                  className="w-full bg-transparent text-foreground text-base font-bold placeholder:text-muted-foreground outline-none"
                />
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={5}
                  maxLength={2000}
                  className="w-full bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Posts list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-success/20 border border-primary/20 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">Start the {activeForum} conversation</p>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-5">Be the first to post in the {activeForum} forum</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-success text-sm font-bold text-primary-foreground"
            >
              Create thread
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-3">
            {posts.map(post => (
              <button
                key={post.id}
                onClick={() => setSearchParams({ forum: activeForum, post: post.id })}
                className="w-full text-left px-4 py-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  {post.avatar_url ? (
                    <img src={post.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-black text-primary-foreground">
                      {getInitials(post.username)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-foreground">@{post.username}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{timeAgo(post.created_at)}</span>
                  </div>
                </div>
                <h3 className="text-[13px] font-bold text-foreground mb-1">{post.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.content}</p>
                <div className="flex items-center gap-4 mt-2.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Heart className={cn("w-3.5 h-3.5", post.liked && "fill-destructive text-destructive")} />
                    <span className="text-[10px]">{post.likes_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{post.replies_count}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Forums;
