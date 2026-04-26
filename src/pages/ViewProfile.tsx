import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, FileText, Grid3x3, Info, MessageSquare, MoreVertical, NotebookPen, Shield, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";
import PostDetailModal from "@/components/PostDetailModal";
import SharePostSheet from "@/components/SharePostSheet";
import DetailCardsGrid, { type DetailCardItem } from "@/components/profile/DetailCardsGrid";

interface ViewPostItem {
  id: string;
  user_id: string;
  content?: string | null;
  caption?: string | null;
  media_url?: string | null;
  media_urls?: string[] | null;
  image_url?: string | null;
  tags?: string[] | null;
  created_at: string;
  kind: "post" | "repost";
  originalUsername?: string;
}

const ViewProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tradingProfile, setTradingProfile] = useState<any>(null);
  const [posts, setPosts] = useState<ViewPostItem[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [openPost, setOpenPost] = useState<ViewPostItem | null>(null);
  const [postToShare, setPostToShare] = useState<ViewPostItem | null>(null);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate("/feed", { replace: true });
  };

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) setMyId(user.id);

      const [{ data: prof }, { data: tp }, journalResponse, { data: repostRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("journal_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("post_reposts" as any).select("post_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const { data: ownPosts } = await supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      const repostIds = [...new Set((repostRows || []).map((row: any) => row.post_id))];
      const { data: repostPosts } = repostIds.length > 0 ? await supabase.from("posts").select("*").in("id", repostIds) : { data: [] as any[] };
      const repostAuthorIds = [...new Set((repostPosts || []).map((post: any) => post.user_id))];
      const { data: repostAuthors } = repostAuthorIds.length > 0 ? await supabase.from("profiles").select("id, username").in("id", repostAuthorIds) : { data: [] as any[] };
      const authorMap = new Map((repostAuthors || []).map((row: any) => [row.id, row]));
      const repostPostMap = new Map((repostPosts || []).map((row: any) => [row.id, row]));

      const mergedPosts: ViewPostItem[] = [
        ...((ownPosts || []).map((post: any) => ({ ...post, kind: "post" as const }))),
        ...((repostRows || []).map((row: any) => {
          const original = repostPostMap.get(row.post_id);
          const author = original ? authorMap.get(original.user_id) : null;
          return original ? {
            ...original,
            created_at: row.created_at,
            kind: "repost" as const,
            originalUsername: author?.username ? `@${author.username}` : "@trader",
          } : null;
        }).filter(Boolean) as ViewPostItem[]),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setProfile(prof);
      setTradingProfile(tp);
      setPosts(mergedPosts);
      setJournalEntries(journalResponse.data || []);

      if (user) {
        const [{ data: conn }, { data: blockData }] = await Promise.all([
          supabase
            .from("partner_connections")
            .select("id, status")
            .or(`and(requester_id.eq.${user.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user.id})`)
            .maybeSingle(),
          supabase.from("blocked_users").select("id").eq("blocker_id", user.id).eq("blocked_id", userId).maybeSingle(),
        ]);

        setConnectionStatus(conn?.status || null);
        setConnectionId(conn?.id || null);
        setIsBlocked(!!blockData);

        if (user.id !== userId) {
          const { data: myProf } = await supabase.from("profiles").select("username").eq("id", user.id).single();
          sendNotification({
            userId,
            type: "profile_viewed",
            title: `@${myProf?.username || "someone"} viewed your profile`,
            body: "They might be interested in connecting",
            relatedUserId: user.id,
          });
        }
      }

      setLoading(false);
    };

    load();
  }, [userId]);

  const handleConnect = async () => {
    if (!myId || !userId || sending || connectionStatus === "pending") return;
    setSending(true);

    const { error } = await supabase.from("partner_connections").insert({
      requester_id: myId,
      receiver_id: userId,
      status: "pending",
      match_score: 0,
      match_breakdown: {},
    });

    if (error) {
      toast.error("Could not send request");
    } else {
      toast.success("Match request sent");
      setConnectionStatus("pending");
      const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myId).single();
      await sendNotification({
        userId,
        type: "partner_request",
        title: "New connection request",
        body: `@${myProf?.username || "someone"} wants to connect with you`,
        relatedUserId: myId,
      });
    }

    setSending(false);
  };

  const handleUnmatch = async () => {
    if (!connectionId) return;
    if (!confirm("Unmatch this partner?")) return;

    const { error } = await supabase.from("partner_connections").delete().eq("id", connectionId);
    if (error) {
      toast.error("Failed to unmatch");
      return;
    }

    setConnectionStatus(null);
    setConnectionId(null);
    setShowMenu(false);
    toast.success("Unmatched");
  };

  const handleBlock = async () => {
    if (!myId || !userId) return;
    if (!confirm(`Block @${profile?.username || "this user"}?`)) return;

    await supabase.from("blocked_users").insert({ blocker_id: myId, blocked_id: userId });
    if (connectionId) {
      await supabase.from("partner_connections").delete().eq("id", connectionId);
      setConnectionStatus(null);
      setConnectionId(null);
    }

    setIsBlocked(true);
    setShowMenu(false);
    toast.success(`Blocked @${profile?.username || "user"}`);
  };

  const handleUnblock = async () => {
    if (!myId || !userId) return;
    await supabase.from("blocked_users").delete().eq("blocker_id", myId).eq("blocked_id", userId);
    setIsBlocked(false);
    setShowMenu(false);
    toast.success(`Unblocked @${profile?.username || "user"}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || `@${profile?.username || "trader"}`;
  const displayUsername = profile?.username ? `@${profile.username}` : "@trader";
  const first = (arr?: any): string | null => (Array.isArray(arr) && arr.length > 0 ? String(arr[0]) : null);
  const detailItems: DetailCardItem[] = ([
    { label: "Session", value: first(tradingProfile?.sessions) },
    { label: "Trading Style", value: first(tradingProfile?.trading_style) },
    { label: "Strategy", value: first(tradingProfile?.strategies) },
    { label: "Charts", value: first(profile?.chart_prompts) },
    { label: "Interests", value: first(profile?.hobbies) },
    { label: "Off Chart", value: first(profile?.off_chart_prompts) },
    { label: "Timeframe", value: first(tradingProfile?.timeframes) },
    { label: "Experience level", value: tradingProfile?.experience_level || null },
    { label: "Markets", value: first(tradingProfile?.markets) },
    { label: "Instruments", value: first(tradingProfile?.instruments) },
    { label: "Trade Times", value: first(tradingProfile?.trade_times) },
    { label: "Primary Goal", value: first(tradingProfile?.primary_goal) },
    { label: "Struggles", value: first(tradingProfile?.struggles) },
    { label: "Looking For", value: tradingProfile?.looking_for_gender || null },
    { label: "Gender", value: profile?.gender || null },
    { label: "Connection Reach", value: (() => {
        const r = (tradingProfile?.connection_reach || "").toLowerCase();
        return r === "local" ? "Local" : r === "global" ? "Global" : r === "both" ? "Local/Global" : null;
      })() },
  ].filter((it) => !!it.value) as DetailCardItem[]);

  return (
    <>
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
        <button onClick={handleBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted">
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
        </button>
        {myId && myId !== userId ? (
          <div className="relative">
            <button onClick={() => setShowMenu((current) => !current)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted">
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-11 min-w-[180px] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                {connectionStatus === "accepted" && (
                  <button onClick={handleUnmatch} className="w-full px-4 py-3 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted">
                    Unmatch
                  </button>
                )}
                {isBlocked ? (
                  <button onClick={handleUnblock} className="w-full px-4 py-3 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted">
                    Unblock
                  </button>
                ) : (
                  <button onClick={handleBlock} className="w-full px-4 py-3 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10">
                    Block
                  </button>
                )}
              </div>
            )}
          </div>
        ) : <div className="h-9 w-9" />}
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        <div className="px-5 pt-6">
          <div className="flex items-start gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile photo" className="h-24 w-24 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-secondary text-2xl font-black text-foreground">
                {getInitials(profile?.full_name || profile?.username || "T")}
              </div>
            )}
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="text-[1.8rem] font-extrabold leading-none text-foreground">{displayName}</h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{displayUsername}</p>
              {profile?.bio ? (
                <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-foreground">{profile.bio}</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No bio yet.</p>
              )}
            </div>
          </div>
        </div>

        {myId && myId !== userId && (
          <div className="mt-5 px-5">
            {isBlocked ? (
              <button onClick={handleUnblock} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted">
                <ShieldOff className="h-4 w-4" />
                Unblock
              </button>
            ) : connectionStatus === "accepted" ? (
              <button onClick={() => navigate(`/messages?partner=${userId}`)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
                <MessageSquare className="h-4 w-4" />
                Message
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={sending || connectionStatus === "pending"}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-opacity",
                  connectionStatus === "pending" ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
                )}
              >
                {connectionStatus === "pending" ? "Pending" : "Match request"}
              </button>
            )}
          </div>
        )}

        <div className="mt-6 flex border-b border-border px-5">
          {[
            { Icon: FileText, label: "Posts" },
            { Icon: Grid3x3, label: "Grid" },
            { Icon: NotebookPen, label: "Journal" },
            { Icon: Info, label: "Details" },
          ].map(({ Icon, label }, index) => (
            <button
              key={label}
              onClick={() => setActiveTab(index)}
              aria-label={label}
              title={label}
              className={cn(
                "relative flex-1 flex items-center justify-center py-3 transition-colors",
                activeTab === index ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={activeTab === index ? 2.4 : 1.8} />
              {activeTab === index && <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-foreground" />}
            </button>
          ))}
        </div>

        {activeTab === 0 ? (
          (() => { const visible = posts.filter((p) => (p as any).share_to_feed !== false); return visible.length > 0 ? (
            <div>
              {visible.map((post) => {
                const media = post.media_urls?.[0] || post.media_url || post.image_url;
                return (
                  <button key={post.id} onClick={() => setOpenPost(post)} className="block w-full border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted/20">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-secondary">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Profile photo" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">{getInitials(profile?.full_name || profile?.username || "T")}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{displayUsername}</span>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                        </div>
                        {post.kind === "repost" && (
                          <p className="mt-1 text-[11px] font-medium text-muted-foreground">Reposted from {post.originalUsername}</p>
                        )}
                        {(post.content || post.caption) && <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-foreground">{post.content || post.caption}</p>}
                        {!!post.tags?.length && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {post.tags.map((tag: string) => (
                              <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-foreground">#{tag}</span>
                            ))}
                          </div>
                        )}
                        {media && (
                          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-secondary">
                            <img src={media} alt="Post media" className="max-h-[340px] w-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No posts yet" description="This trader hasn’t posted anything yet." />
          ); })()
        ) : activeTab === 1 ? (
          (() => {
            const photos = posts.filter((p) => {
              const m = p.media_urls?.[0] || p.media_url || p.image_url;
              return !!m;
            });
            if (photos.length === 0) return <EmptyState title="No photos yet" description="This trader hasn't shared any photos yet." />;
            return (
              <div className="grid grid-cols-3 gap-[2px] px-[2px] pb-4">
                {photos.map((post) => {
                  const media = post.media_urls?.[0] || post.media_url || post.image_url;
                  const isMulti = (post.media_urls?.length || 0) > 1;
                  return (
                    <button key={post.id} onClick={() => setOpenPost(post)} className="relative aspect-square overflow-hidden bg-secondary">
                      <img src={media!} alt="Post" className="h-full w-full object-cover" />
                      {isMulti && (
                        <div className="absolute right-1.5 top-1.5 rounded-full bg-background/70 px-1.5 py-0.5 text-[9px] font-bold text-foreground backdrop-blur">
                          {post.media_urls!.length}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()
        ) : activeTab === 2 ? (
          journalEntries.length > 0 ? (
            <div className="space-y-3 px-5 py-4">
              {journalEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.result && <span className="text-sm font-bold text-foreground">{entry.result}</span>}
                        {entry.market_pair && <span className="text-xs text-muted-foreground">{entry.market_pair}</span>}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(entry.created_at)}</p>
                    </div>
                    {typeof entry.pnl_pips === "number" && (
                      <span className="text-sm font-bold text-foreground">
                        {(entry as any).pnl_unit === "dollars"
                          ? `${entry.pnl_pips >= 0 ? "+$" : "-$"}${Math.abs(entry.pnl_pips)}`
                          : `${entry.pnl_pips > 0 ? "+" : ""}${entry.pnl_pips} pips`}
                      </span>
                    )}
                  </div>
                  {entry.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{entry.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No journal yet" description="Nothing shared here yet." />
          )
        ) : (
          detailItems.length > 0 ? (
            <DetailCardsGrid items={detailItems} />
          ) : (
            <EmptyState title="No details yet" description="This trader hasn’t filled out their trading details." />
          )
        )}
      </div>
    </div>
    <PostDetailModal
      open={!!openPost}
      onClose={() => setOpenPost(null)}
      post={openPost as any}
      myId={myId}
      onShare={(post) => setPostToShare(post as ViewPostItem)}
    />
    <SharePostSheet post={postToShare as any} myId={myId} onClose={() => setPostToShare(null)} />
    </>
  );
};

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
    <p className="text-base font-bold text-foreground">{title}</p>
    <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">{description}</p>
  </div>
);

export default ViewProfile;
