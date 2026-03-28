import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronDown, X, MessageSquare, Link2, ImageIcon, Settings, MapPin, Flame, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo, computeMatch, getBreakdownLabel } from "@/lib/matchUtils";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";

const BREAKDOWN_KEYS = ["Market", "Session", "Strategy", "Style", "Timeframe", "Experience", "Goal"];

const ViewProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [matchOpen, setMatchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tradingProfile, setTradingProfile] = useState<any>(null);
  const [myTradingProfile, setMyTradingProfile] = useState<any>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [stats, setStats] = useState({ partners: 0, streak: 0, winRate: 0 });
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMyId(user.id);

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setProfile(prof);

      const { data: tp } = await supabase.from("trading_profiles").select("*").eq("user_id", id).maybeSingle();
      setTradingProfile(tp);

      const { count: pCount } = await supabase
        .from("partner_connections")
        .select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${id},receiver_id.eq.${id}`)
        .eq("status", "accepted");

      const { data: entries } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      let streak = 0;
      if (entries && entries.length > 0) {
        const days = new Set(entries.map(e => e.created_at.slice(0, 10)));
        let d = new Date();
        for (let i = 0; i < 30; i++) {
          if (days.has(d.toISOString().slice(0, 10))) { streak++; d = new Date(d.getTime() - 86400000); }
          else break;
        }
      }

      const withResult = (entries || []).filter(e => e.result === "Win" || e.result === "Loss");
      const wins = withResult.filter(e => e.result === "Win").length;
      const winRate = withResult.length > 0 ? Math.round((wins / withResult.length) * 100) : 0;

      setStats({ partners: pCount || 0, streak, winRate });
      setJournalEntries((entries || []).filter(e => e.share_setting === "partners"));

      if (user) {
        const { data: conn } = await supabase
          .from("partner_connections")
          .select("status, match_score, match_breakdown")
          .or(`and(requester_id.eq.${user.id},receiver_id.eq.${id}),and(requester_id.eq.${id},receiver_id.eq.${user.id})`)
          .maybeSingle();

        setConnectionStatus(conn?.status || null);

        if (conn?.match_score) {
          setMatchScore(conn.match_score);
          setBreakdown((conn.match_breakdown as Record<string, number>) || {});
        } else {
          const { data: myTp } = await supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle();
          setMyTradingProfile(myTp);
          if (myTp && tp) {
            const result = computeMatch(myTp, tp);
            setMatchScore(result.pct);
            setBreakdown(result.breakdown);
          }
        }

        if (!myTradingProfile) {
          const { data: myTp } = await supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle();
          setMyTradingProfile(myTp);
        }
      }

      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      setPosts(postsData || []);

      if (user && user.id !== id) {
        const { data: myProf } = await supabase.from("profiles").select("username").eq("id", user.id).single();
        sendNotification({
          userId: id,
          type: "profile_viewed",
          title: `@${myProf?.username || "someone"} viewed your profile`,
          body: "They might be interested in connecting",
          relatedUserId: user.id,
        });
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const handleConnect = async () => {
    if (!myId || !id || sending) return;
    setSending(true);
    const { error } = await supabase.from("partner_connections").insert({
      requester_id: myId,
      receiver_id: id,
      status: "pending",
      match_score: matchScore || 0,
      match_breakdown: breakdown,
    });
    if (error) {
      toast.error("Could not send request");
    } else {
      toast.success("Partner request sent!");
      setConnectionStatus("pending");
      const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myId).single();
      await sendNotification({
        userId: id,
        type: "partner_request",
        title: "New connection request",
        body: `@${myProf?.username || "someone"} wants to connect with you`,
        relatedUserId: myId,
      });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const displayLocation = (() => {
    if (!profile) return null;
    const parts = [profile.city, profile.state, profile.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : profile.location || null;
  })();

  const detailSections = [
    { label: "Markets", items: tradingProfile?.markets, icon: "📊" },
    { label: "Sessions", items: tradingProfile?.sessions, icon: "🌍" },
    { label: "Strategies", items: tradingProfile?.strategies, icon: "🎯" },
    { label: "Trading Style", items: tradingProfile?.trading_style, icon: "⚡" },
    { label: "Timeframes", items: tradingProfile?.timeframes, icon: "⏱" },
    { label: "Primary Goals", items: tradingProfile?.primary_goal, icon: "🏆" },
    { label: "Struggles", items: tradingProfile?.struggles, icon: "💪" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Gradient Banner */}
      <div className="relative h-40 bg-gradient-to-br from-primary via-accent/80 to-success overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center z-10 hover:bg-black/30 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 -mt-14">
        {/* Avatar */}
        <div className="px-5">
          <div className="relative w-[96px] h-[96px]">
            <div className="w-full h-full rounded-full p-[3px] bg-background shadow-lg">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[28px] font-black text-primary-foreground">
                  {getInitials(profile?.full_name)}
                </div>
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-success border-[3px] border-background" />
          </div>
        </div>

        {/* Name + Bio */}
        <div className="px-5 mt-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">@{profile?.username || "trader"}</h1>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" fill="url(#vg3)" />
              <path d="M6.5 10l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="vg3" x1="0" y1="0" x2="20" y2="20"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--success))" /></linearGradient></defs>
            </svg>
          </div>

          {tradingProfile?.experience_level && (
            <span className="text-xs text-muted-foreground">{tradingProfile.experience_level} Trader</span>
          )}

          {profile?.bio && (
            <p className="text-sm text-muted-foreground mt-2 max-w-[320px] leading-relaxed">{profile.bio}</p>
          )}

          {displayLocation && (
            <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {displayLocation}
            </div>
          )}

          {/* Market pills */}
          {tradingProfile?.markets?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tradingProfile.markets.map((m: string) => (
                <span key={m} className="px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-xs font-semibold text-primary">{m}</span>
              ))}
            </div>
          )}
        </div>

        {/* Match Card */}
        {matchScore !== null && (
          <div className="mx-5 mt-4 bg-card border border-primary/15 rounded-2xl overflow-hidden">
            <button onClick={() => setMatchOpen(!matchOpen)} className="w-full flex items-center gap-3 p-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-success flex items-center justify-center shadow-md">
                <span className="text-lg font-black text-white">{matchScore}%</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-foreground">Match Score</div>
                <div className="text-xs text-muted-foreground">Tap to see breakdown</div>
              </div>
              <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", matchOpen && "rotate-180")} />
            </button>
            {matchOpen && (
              <div className="px-4 pb-4 space-y-1">
                {BREAKDOWN_KEYS.map((key) => {
                  const val = breakdown[key] ?? 0;
                  const dotColor = val >= 80 ? "bg-success" : val >= 50 ? "bg-primary" : "bg-muted-foreground/40";
                  const label = getBreakdownLabel(key, val, myTradingProfile, tradingProfile);
                  return (
                    <div key={key} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-2.5 h-2.5 rounded-full", dotColor)} />
                        <span className="text-xs font-medium text-muted-foreground">{key}</span>
                      </div>
                      <span className={cn("text-xs font-semibold", val >= 80 ? "text-success" : val >= 50 ? "text-primary" : "text-muted-foreground")}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 px-5 mt-5">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-lg font-black text-foreground">{stats.partners}</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Partners</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-destructive" />
              <span className="text-lg font-black text-foreground">{stats.streak}</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Day Streak</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <span className="text-lg font-black text-foreground">{stats.winRate}%</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Win Rate</span>
          </div>
        </div>

        {/* Prompt Cards */}
        {((profile?.chart_prompts?.length > 0) || (profile?.off_chart_prompts?.length > 0)) && (
          <div className="px-5 space-y-2.5 mt-4">
            {profile?.chart_prompts?.length > 0 && (
              <div className="bg-card border border-primary/15 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2.5">📊 My Charts</div>
                <div className="flex flex-wrap gap-2">
                  {profile.chart_prompts.map((p: string) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {profile?.off_chart_prompts?.length > 0 && (
              <div className="bg-card border border-accent/15 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-2.5">🎯 Off The Charts</div>
                <div className="flex flex-wrap gap-2">
                  {profile.off_chart_prompts.map((p: string) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-accent/10 text-xs font-semibold text-accent">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mx-5 mt-5">
          {["Profile", "Sessions", "Details"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-wider relative transition-colors text-center",
                activeTab === i ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab}
              {activeTab === i && <div className="absolute bottom-0 left-[15%] right-[15%] h-[2px] rounded-full bg-gradient-to-r from-primary to-accent" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 ? (
          posts.filter((p: any) => p.image_url || p.media_url).length > 0 ? (
            <div className="grid grid-cols-3 gap-[2px] mt-[2px]">
              {posts.filter((p: any) => p.image_url || p.media_url).map((post: any) => (
                <button key={post.id} onClick={() => navigate(`/feed?post=${post.id}`)} className="aspect-square overflow-hidden bg-muted">
                  {post.media_type === "video" ? (
                    <video src={post.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={post.image_url || post.media_url} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">No posts yet</p>
              <p className="text-xs text-muted-foreground">This trader hasn't shared any photos.</p>
            </div>
          )
        ) : activeTab === 1 ? (
          journalEntries.length > 0 ? (
            <div className="px-5 space-y-2.5 py-4">
              {journalEntries.map((entry: any) => (
                <div key={entry.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-foreground">{entry.mood}</span>
                    {entry.market_pair && <span className="text-xs text-muted-foreground">· {entry.market_pair}</span>}
                    {entry.session && <span className="text-xs text-muted-foreground">· {entry.session}</span>}
                    <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(entry.created_at)}</span>
                  </div>
                  {entry.notes && <p className="text-sm text-foreground mb-2.5 leading-relaxed">{entry.notes}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.result && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${entry.result === "Win" ? "text-success bg-success/15" : "text-destructive bg-destructive/15"}`}>
                        {entry.result}{entry.pnl_pips ? ` ${entry.pnl_pips > 0 ? "+" : ""}${entry.pnl_pips} pips` : ""}
                      </span>
                    )}
                    {entry.tags?.map((t: string) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <p className="text-sm font-bold text-foreground mb-1">No shared sessions</p>
              <p className="text-xs text-muted-foreground">This trader hasn't shared any sessions yet.</p>
            </div>
          )
        ) : (
          detailSections.some(s => s.items?.length > 0) || tradingProfile?.experience_level ? (
            <div className="px-5 py-4 space-y-2.5">
              {tradingProfile?.experience_level && (
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">🏅 Experience</div>
                  <span className="text-sm font-bold text-foreground">{tradingProfile.experience_level}</span>
                </div>
              )}
              {detailSections.map(s => s.items?.length > 0 && (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">{s.icon} {s.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {s.items!.map((d: string) => (
                      <span key={d} className="px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-foreground">{d}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">No details yet</p>
              <p className="text-xs text-muted-foreground">This trader hasn't filled in their details.</p>
            </div>
          )
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent z-50 flex gap-2.5">
        {connectionStatus === "accepted" ? (
          <>
            <button
              onClick={() => navigate(-1)}
              className="w-14 py-3 rounded-xl bg-card border border-border flex items-center justify-center"
            >
              <X className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-success flex items-center justify-center gap-2 text-sm font-bold text-primary-foreground shadow-lg"
            >
              <MessageSquare className="w-5 h-5" strokeWidth={2} /> Message
            </button>
          </>
        ) : connectionStatus === "pending" ? (
          <button disabled className="flex-1 py-3.5 rounded-xl bg-card border border-border flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground">
            Request Pending
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate(-1)}
              className="w-14 py-3 rounded-xl bg-card border border-border flex items-center justify-center"
            >
              <X className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
            </button>
            <button
              onClick={handleConnect}
              disabled={sending}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-success flex items-center justify-center gap-2 text-sm font-bold text-primary-foreground shadow-lg"
            >
              <Link2 className="w-5 h-5" strokeWidth={2} /> Connect
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewProfile;
