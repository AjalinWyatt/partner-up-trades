import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronDown, X, UserPlus, MessageSquare, Link2, ImageIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo, computeMatch } from "@/lib/matchUtils";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";

const CRITERIA_LABELS = ["Market", "Session", "Strategy", "Style", "Timeframe", "Experience", "Goal"];

const ViewProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [matchOpen, setMatchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tradingProfile, setTradingProfile] = useState<any>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({ partners: 0, followers: 0 });
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMyId(user.id);

      // Fetch target profile
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setProfile(prof);

      // Fetch trading profile
      const { data: tp } = await supabase.from("trading_profiles").select("*").eq("user_id", id).maybeSingle();
      setTradingProfile(tp);

      // Fetch partner count
      const { count: pCount } = await supabase
        .from("partner_connections")
        .select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${id},receiver_id.eq.${id}`)
        .eq("status", "accepted");
      setStats({ partners: pCount || 0, followers: 0 });

      // Check connection status with me
      if (user) {
        const { data: conn } = await supabase
          .from("partner_connections")
          .select("status")
          .or(`and(requester_id.eq.${user.id},receiver_id.eq.${id}),and(requester_id.eq.${id},receiver_id.eq.${user.id})`)
          .maybeSingle();
        setConnectionStatus(conn?.status || null);

        // Compute match
        const { data: myTp } = await supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (myTp && tp) {
          const result = computeMatch(myTp, tp);
          setMatchScore(result.pct);
          setBreakdown(result.breakdown);
        }
      }

      // Fetch shared posts
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", id)
        .in("share_setting", ["Partners", "Public"])
        .order("created_at", { ascending: false })
        .limit(50);
      setPosts(entries || []);

      // Send profile_viewed notification (not for own profile)
      if (user && user.id !== id) {
        const { data: myProf } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        const myName = myProf?.full_name || "Someone";
        sendNotification({
          userId: id,
          type: "profile_viewed",
          title: `${myName} viewed your profile`,
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
      // Fetch my name for notification
      const { data: myProf } = await supabase.from("profiles").select("full_name").eq("id", myId).single();
      const myName = myProf?.full_name || "Someone";
      await sendNotification({
        userId: id,
        type: "partner_request",
        title: "New connection request",
        body: `${myName} wants to connect with you`,
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

  const tagline = [
    ...(tradingProfile?.trading_style || []),
    ...(tradingProfile?.strategies || []).slice(0, 1),
    ...(tradingProfile?.timeframes || []).slice(0, 1),
  ].join(" · ");

  const hasDetails =
    (tradingProfile?.markets?.length > 0) ||
    (tradingProfile?.sessions?.length > 0) ||
    (tradingProfile?.strategies?.length > 0) ||
    (tradingProfile?.trading_style?.length > 0) ||
    (tradingProfile?.timeframes?.length > 0) ||
    (tradingProfile?.experience_level) ||
    (tradingProfile?.primary_goal?.length > 0) ||
    (tradingProfile?.struggles?.length > 0);

  const detailSections = [
    { label: "Markets", items: tradingProfile?.markets },
    { label: "Sessions", items: tradingProfile?.sessions },
    { label: "Strategies", items: tradingProfile?.strategies },
    { label: "Trading Style", items: tradingProfile?.trading_style },
    { label: "Timeframes", items: tradingProfile?.timeframes },
    { label: "Primary Goals", items: tradingProfile?.primary_goal },
    { label: "Struggles", items: tradingProfile?.struggles },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Nav */}
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-base font-extrabold text-foreground">@{profile?.username || "trader"}</span>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="url(#vg3)" />
            <path d="M6.5 10l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <defs><linearGradient id="vg3" x1="0" y1="0" x2="20" y2="20"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--success))" /></linearGradient></defs>
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Match Badge */}
        {matchScore !== null && (
          <div className="mx-5 mb-3 bg-card border border-success/20 rounded-xl overflow-hidden">
            <button onClick={() => setMatchOpen(!matchOpen)} className="w-full flex items-center gap-2.5 p-3 bg-gradient-to-r from-primary/10 to-success/10">
              <span className="text-[28px] font-black text-success">{matchScore}%</span>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-bold text-foreground">Match with you</div>
                <div className="text-[10px] text-muted-foreground">Tap to see why</div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", matchOpen && "rotate-180")} />
            </button>
            {matchOpen && (
              <div className="px-3.5 pb-2.5">
                {CRITERIA_LABELS.map((label) => {
                  const val = breakdown[label] ?? 0;
                  const color = val >= 80 ? "bg-success" : val >= 50 ? "bg-primary" : "bg-muted-foreground";
                  const textColor = val >= 80 ? "text-success" : val >= 50 ? "text-primary" : "text-muted-foreground";
                  return (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${textColor}`}>{val}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="text-center px-5 pb-3">
          <div className="relative w-20 h-20 mx-auto mb-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[26px] font-black text-primary-foreground">
                {getInitials(profile?.full_name)}
              </div>
            )}
          </div>
          <div className="text-base font-extrabold text-foreground">{profile?.full_name || "—"}</div>
          {tagline && <div className="text-xs text-muted-foreground mt-0.5">{tagline}</div>}
          {profile?.location && (
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {profile.location}
            </div>
          )}
          {tradingProfile?.markets?.length > 0 && (
            <div className="flex justify-center gap-1 mt-1.5 flex-wrap">
              {tradingProfile.markets.map((m: string) => (
                <span key={m} className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-success text-[8px] font-bold text-primary-foreground">{m}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-10 px-5 py-3 border-t border-b border-border mx-5 mb-3">
          <div className="text-center">
            <div className="text-base font-black text-foreground">{stats.partners}</div>
            <div className="text-[10px] text-muted-foreground">partners</div>
          </div>
          <div className="text-center">
            <div className="text-base font-black text-foreground">{stats.followers}</div>
            <div className="text-[10px] text-muted-foreground">followers</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-10 px-5 mb-1">
          {["Posts", "Details"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                "py-2.5 text-[10px] font-bold uppercase tracking-wider relative transition-colors",
                activeTab === i ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab}
              {activeTab === i && <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-primary to-success" />}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 0 ? (
          posts.length > 0 ? (
            <div className="px-5 space-y-3 py-3">
              {posts.map((entry) => (
                <div key={entry.id} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground">{entry.mood}</span>
                    {entry.market_pair && <span className="text-[10px] text-muted-foreground">· {entry.market_pair}</span>}
                    {entry.session && <span className="text-[10px] text-muted-foreground">· {entry.session}</span>}
                    <span className="ml-auto text-[9px] text-muted-foreground">{timeAgo(entry.created_at)}</span>
                  </div>
                  {entry.notes && <p className="text-xs text-foreground mb-2">{entry.notes}</p>}
                  <div className="flex items-center gap-2">
                    {entry.result && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${entry.result === "Win" ? "text-success bg-success/15" : "text-destructive bg-destructive/15"}`}>
                        {entry.result}{entry.pnl_pips ? ` ${entry.pnl_pips > 0 ? "+" : ""}${entry.pnl_pips} pips` : ""}
                      </span>
                    )}
                    {entry.tags?.map((t: string) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No posts yet</p>
              <p className="text-xs text-muted-foreground">This trader hasn't shared any posts.</p>
            </div>
          )
        ) : (
          hasDetails ? (
            <div className="px-5 py-3 space-y-2">
              {tradingProfile?.experience_level && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Experience</div>
                  <span className="text-xs font-semibold text-foreground">{tradingProfile.experience_level}</span>
                </div>
              )}
              {detailSections.map(s => s.items?.length > 0 && (
                <div key={s.label} className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{s.label}</div>
                  <div className="flex flex-wrap gap-1">
                    {s.items.map((d: string) => (
                      <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No details yet</p>
              <p className="text-xs text-muted-foreground">This trader hasn't filled in their details.</p>
            </div>
          )
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent z-50 flex gap-2">
        {connectionStatus === "accepted" ? (
          <>
            <button
              onClick={() => navigate(-1)}
              className="flex-[0.5] py-3 rounded-xl bg-muted border border-border flex items-center justify-center"
            >
              <X className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-success flex items-center justify-center gap-1.5 text-sm font-bold text-primary-foreground"
            >
              <MessageSquare className="w-[18px] h-[18px]" strokeWidth={2} /> Message
            </button>
          </>
        ) : connectionStatus === "pending" ? (
          <button disabled className="flex-1 py-3 rounded-xl bg-muted border border-border flex items-center justify-center gap-1.5 text-sm font-bold text-muted-foreground">
            Request Pending
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate(-1)}
              className="flex-[0.5] py-3 rounded-xl bg-muted border border-border flex items-center justify-center"
            >
              <X className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={2} />
            </button>
            <button className="flex-1 py-3 rounded-xl bg-muted border border-border flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
              <UserPlus className="w-[18px] h-[18px]" strokeWidth={2} /> Follow
            </button>
            <button
              onClick={handleConnect}
              disabled={sending}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-success flex items-center justify-center gap-1.5 text-sm font-bold text-primary-foreground"
            >
              <Link2 className="w-[18px] h-[18px]" strokeWidth={2} /> Connect
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewProfile;
