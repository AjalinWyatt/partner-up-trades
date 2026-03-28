import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Heart, MessageCircle, MoreHorizontal, Link2, Eye } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CreatePostModal from "@/components/CreatePostModal";
import NotificationBell from "@/components/NotificationBell";
import PostDetailModal from "@/components/PostDetailModal";
import CommentThread from "@/components/CommentThread";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

interface FeedPost {
  id: string;
  type: "post" | "journal";
  user_id: string;
  // Post fields
  image_url?: string;
  caption?: string | null;
  // Journal fields
  mood?: string | null;
  result?: string | null;
  pnl_pips?: number | null;
  market_pair?: string | null;
  session?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  share_setting?: string | null;
  created_at: string;
  // joined
  username: string;
  full_name: string;
  avatar_url: string | null;
  liked: boolean;
  likeCount: number;
  commentCount: number;
}

const Feed = () => {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const loadFeed = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setMyId(user.id);

    const { data: connections } = await supabase
      .from("partner_connections")
      .select("requester_id, receiver_id")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "accepted");

    const partnerIds = (connections || []).map(c =>
      c.requester_id === user.id ? c.receiver_id : c.requester_id
    );
    const allUserIds = [...partnerIds, user.id];

    // Load both journal entries and posts
    const [{ data: journalEntries }, { data: postsData }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("*")
        .in("user_id", allUserIds.filter(id => id !== user.id))
        .neq("share_setting", "Private")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("posts" as any)
        .select("*")
        .in("user_id", allUserIds)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const allItems: any[] = [
      ...(journalEntries || []).map((e: any) => ({ ...e, _type: "journal" })),
      ...(postsData || []).map((e: any) => ({ ...e, _type: "post" })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (allItems.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const itemIds = allItems.map(e => e.id);
    const authorIds = [...new Set(allItems.map(e => e.user_id))];

    const [profilesRes, likesRes, myLikesRes, commentsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", authorIds),
      supabase.from("feed_likes").select("entry_id, post_id").in("entry_id", itemIds),
      supabase.from("feed_likes").select("entry_id, post_id").in("entry_id", itemIds).eq("user_id", user.id),
      supabase.from("feed_comments").select("entry_id, post_id").in("entry_id", itemIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
    const likeCounts: Record<string, number> = {};
    (likesRes.data || []).forEach((l: any) => {
      const key = l.entry_id || l.post_id;
      likeCounts[key] = (likeCounts[key] || 0) + 1;
    });
    const myLikedSet = new Set((myLikesRes.data || []).map((l: any) => l.entry_id || l.post_id));
    const commentCounts: Record<string, number> = {};
    (commentsRes.data || []).forEach((c: any) => {
      const key = c.entry_id || c.post_id;
      commentCounts[key] = (commentCounts[key] || 0) + 1;
    });

    const feedItems: FeedPost[] = allItems.map(e => {
      const prof = profileMap.get(e.user_id);
      return {
        ...e,
        type: e._type as "post" | "journal",
        username: prof?.username || "trader",
        full_name: prof?.full_name || "Trader",
        avatar_url: prof?.avatar_url || null,
        liked: myLikedSet.has(e.id),
        likeCount: likeCounts[e.id] || 0,
        commentCount: commentCounts[e.id] || 0,
      };
    });

    setEntries(feedItems);
    setLoading(false);
  };

  useEffect(() => {
    loadFeed();

    // Real-time: new posts appear instantly
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "journal_entries" }, () => {
        loadFeed();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_likes" }, (payload) => {
        const p = payload.new as { entry_id: string; user_id: string };
        setEntries(prev => prev.map(e =>
          e.id === p.entry_id ? { ...e, likeCount: e.likeCount + 1 } : e
        ));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "feed_likes" }, (payload) => {
        const p = payload.old as { entry_id: string };
        setEntries(prev => prev.map(e =>
          e.id === p.entry_id ? { ...e, likeCount: Math.max(0, e.likeCount - 1) } : e
        ));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_comments" }, (payload) => {
        const p = payload.new as { entry_id: string };
        setEntries(prev => prev.map(e =>
          e.id === p.entry_id ? { ...e, commentCount: e.commentCount + 1 } : e
        ));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "feed_comments" }, (payload) => {
        const p = payload.old as { entry_id: string };
        setEntries(prev => prev.map(e =>
          e.id === p.entry_id ? { ...e, commentCount: Math.max(0, e.commentCount - 1) } : e
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCommentCountChange = (entryId: string, delta: number) => {
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, commentCount: e.commentCount + delta } : e
    ));
  };

  const toggleLike = async (entryId: string) => {
    if (!myId) return;
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.liked) {
      await supabase.from("feed_likes").delete().eq("user_id", myId).eq("entry_id", entryId);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, liked: false, likeCount: e.likeCount - 1 } : e));
    } else {
      await supabase.from("feed_likes").insert({ user_id: myId, entry_id: entryId });
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, liked: true, likeCount: e.likeCount + 1 } : e));
      // Send notification to post owner (not self)
      if (entry.user_id !== myId) {
        const { data: myProf } = await supabase.from("profiles").select("full_name").eq("id", myId).single();
        const myName = myProf?.full_name || "Someone";
        await sendNotification({
          userId: entry.user_id,
          type: "post_liked",
          title: `${myName} liked your session`,
          body: `Your ${entry.market_pair || "trading"} session post got a like`,
          relatedUserId: myId,
          entryId,
        });
      }
    }
  };

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
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button onClick={() => setShowCreatePost(true)} className="w-8 h-8 flex items-center justify-center">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="text-base font-black text-foreground">traders🌐world</span>
          <NotificationBell />
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Your feed is empty</p>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-4">Connect with partners to see their sessions here</p>
            <button
              onClick={() => navigate("/discover")}
              className="px-6 py-2.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
            >
              Find Partners
            </button>
          </div>
        ) : (
          <div className="px-5 space-y-3 pb-8">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-card border border-border rounded-xl p-3.5">
                {/* Post Header */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <button onClick={() => navigate(`/profile/${entry.user_id}`)}>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-black text-primary-foreground">
                        {getInitials(entry.full_name)}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/profile/${entry.user_id}`)} className="text-xs font-bold text-foreground hover:underline">
                      {entry.username}
                    </button>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {entry.market_pair && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{entry.market_pair}</span>
                      )}
                      {entry.session && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">{entry.session}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground">{timeAgo(entry.created_at)}</span>
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === entry.id ? null : entry.id)}>
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {menuOpen === entry.id && (
                        <div className="absolute right-0 top-6 w-44 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                          <button
                            onClick={() => { navigate(`/profile/${entry.user_id}`); setMenuOpen(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </button>
                          {entry.user_id !== myId && (
                            <button
                              onClick={() => { navigate(`/profile/${entry.user_id}`); setMenuOpen(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                            >
                              <Link2 className="w-3.5 h-3.5" /> Request Match
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post Body */}
                {entry.type === "post" && entry.image_url && (
                  <button onClick={() => setSelectedPost(entry)} className="rounded-xl overflow-hidden mb-2.5 -mx-3.5 w-[calc(100%+1.75rem)]">
                    <img src={entry.image_url} alt="" className="w-full object-cover" />
                  </button>
                )}
                {entry.type === "post" && entry.caption && (
                  <p className="text-xs text-foreground mb-2.5 leading-relaxed">
                    <span className="font-bold mr-1">{entry.username}</span>{entry.caption}
                  </p>
                )}
                {entry.type === "journal" && entry.notes && <p className="text-xs text-foreground mb-2.5 leading-relaxed">{entry.notes}</p>}

                {/* Result + Tags (journal only) */}
                {entry.type === "journal" && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                    {entry.result && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        entry.result === "Win"
                          ? "text-success bg-success/15"
                          : entry.result === "Loss"
                          ? "text-destructive bg-destructive/15"
                          : "text-muted-foreground bg-muted"
                      }`}>
                        {entry.result}{entry.pnl_pips ? ` ${entry.pnl_pips > 0 ? "+" : ""}${entry.pnl_pips} pips` : ""}
                      </span>
                    )}
                    {entry.tags?.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1 border-t border-border">
                  <div className="flex items-center gap-5">
                    <button onClick={() => toggleLike(entry.id)} className="flex items-center gap-1 pt-2">
                      <Heart className={`w-4 h-4 ${entry.liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                      {entry.likeCount > 0 && <span className="text-[10px] text-muted-foreground">{entry.likeCount}</span>}
                    </button>
                    <div className="flex items-center gap-1 pt-2">
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      {entry.commentCount > 0 && <span className="text-[10px] text-muted-foreground">{entry.commentCount}</span>}
                    </div>
                  </div>
                  <CommentThread
                    entryId={entry.id}
                    entryOwnerId={entry.user_id}
                    myId={myId}
                    commentCount={entry.commentCount}
                    onCountChange={handleCommentCountChange}
                  />
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
    </AppLayout>
  );
};

export default Feed;
