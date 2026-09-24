import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ChevronLeft, MessageSquare, MoreHorizontal, MoreVertical, ShieldOff, UserPlus, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ProfileJournalCards, { type ProfileJournalEntry } from "@/components/profile/ProfileJournalCards";
import TraderDetailsPanel from "@/components/profile/TraderDetailsPanel";
import ProfileHero, { ProfileBottomNav } from "@/components/profile/ProfileHero";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSessionCache, invalidateSessionCache } from "@/hooks/use-session-cache";
import { useSwipeBack } from "@/hooks/use-swipe-back";
import { cn } from "@/lib/utils";
import { computeMatch, type MatchResult } from "@/lib/matchUtils";
import { sendNotification } from "@/lib/notifications";
import { toast } from "sonner";

const PROFILE_FIELDS = "id, username, full_name, avatar_url, cover_url, bio, birth_year, gender, location, city, state, country, hobbies, off_chart_prompts, chart_prompts, profile_visibility, onboarding_completed, created_at";

export default function ViewProfile() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const cacheKey = userId || "unknown";
  const [activeTab, setActiveTab] = useState<"details" | "journal">("details");
  const [profile, setProfile, hadCache] = useSessionCache<any>(`viewprofile:${cacheKey}:profile`, null);
  const [tradingProfile, setTradingProfile] = useSessionCache<any>(`viewprofile:${cacheKey}:trading`, null);
  const [journalEntries, setJournalEntries] = useSessionCache<ProfileJournalEntry[]>(`viewprofile:${cacheKey}:journal`, []);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myTrading, setMyTrading] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [connection, setConnection] = useState<any>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(!hadCache);
  const [busy, setBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleBack = () => window.history.state?.idx > 0 ? navigate(-1) : navigate("/discover", { replace: true });
  useSwipeBack({ onBack: handleBack });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const viewer = session?.user;
      if (!viewer) { setLoading(false); return; }
      setMyId(viewer.id);
      if (viewer.id === userId) { navigate("/profile", { replace: true }); return; }

      const [{ data: viewedProfile }, { data: viewedTrading }, { data: viewerProfile }, { data: viewerTrading }, { data: connections }, { data: block }] = await Promise.all([
        supabase.from("profiles").select(PROFILE_FIELDS).eq("id", userId).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select(PROFILE_FIELDS).eq("id", viewer.id).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", viewer.id).maybeSingle(),
        supabase.from("partner_connections").select("id, status, requester_id, receiver_id").or(`and(requester_id.eq.${viewer.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${viewer.id})`).order("updated_at", { ascending: false }).limit(1),
        supabase.from("blocked_users").select("id").eq("blocker_id", viewer.id).eq("blocked_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const currentConnection = connections?.[0] || null;
      setProfile(viewedProfile);
      setTradingProfile(viewedTrading);
      setMyProfile(viewerProfile);
      setMyTrading(viewerTrading);
      setConnection(currentConnection);
      setIsBlocked(!!block);

      // Visibility enforced by database rules: public for everyone, partners only for accepted partners.
      const allowed = currentConnection?.status === "accepted" ? ["public", "partners"] : ["public"];
      const { data: visibleEntries } = await supabase.from("journal_entries").select("*").eq("user_id", userId).in("share_setting", allowed).eq("hidden_from_journal", false).order("created_at", { ascending: false }).limit(30);
      if (!cancelled) setJournalEntries((visibleEntries as ProfileJournalEntry[]) || []);
      if (viewer.id !== userId) {
        void sendNotification({ userId, type: "profile_viewed", title: `@${viewerProfile?.username || "someone"} viewed your profile`, body: "They might be interested in connecting", relatedUserId: viewer.id });
      }
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [navigate, setJournalEntries, setProfile, setTradingProfile, userId]);

  // Refresh visible Journal entries immediately when the partnership state changes.
  const connectionStatus = connection?.status ?? null;
  useEffect(() => {
    if (!userId || !myId || loading) return;
    const allowed = connectionStatus === "accepted" ? ["public", "partners"] : ["public"];
    void supabase.from("journal_entries").select("*").eq("user_id", userId).in("share_setting", allowed).eq("hidden_from_journal", false).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setJournalEntries((data as ProfileJournalEntry[]) || []));
  }, [connectionStatus, userId, myId, loading, setJournalEntries]);

  const compatibility = useMemo<MatchResult | null>(() => {
    if (!myTrading || !tradingProfile || !myProfile || !profile) return null;
    const result = computeMatch(myTrading, tradingProfile, myProfile, profile);
    return Object.keys(result.breakdown).length > 0 ? result : null;
  }, [myProfile, myTrading, profile, tradingProfile]);

  const refreshCaches = () => invalidateSessionCache("partners:pending", "partners:partners", "dashboard:stats", "dashboard:updates", "discover:matches");

  const sendRequest = async () => {
    if (!myId || !userId || busy) return;
    setBusy(true);
    const payload = { requester_id: myId, receiver_id: userId, status: "pending", match_score: compatibility?.pct || 0, match_breakdown: compatibility?.breakdown || {} };
    const { data, error } = connection?.status === "declined"
      ? await supabase.from("partner_connections").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", connection.id).select("id, status, requester_id, receiver_id").single()
      : await supabase.from("partner_connections").insert(payload).select("id, status, requester_id, receiver_id").single();
    if (error) toast.error("Could not send request");
    else {
      setConnection(data); refreshCaches(); toast.success("Connection request sent");
      void sendNotification({ userId, type: "partner_request", title: "New connection request", body: `@${myProfile?.username || "someone"} wants to connect with you`, relatedUserId: myId });
    }
    setBusy(false);
  };

  const updateRequest = async (status: "accepted" | "declined") => {
    if (!connection || !myId || busy) return;
    setBusy(true);
    const { error } = await supabase.from("partner_connections").update({ status, updated_at: new Date().toISOString() }).eq("id", connection.id);
    if (error) toast.error(`Could not ${status === "accepted" ? "accept" : "decline"} request`);
    else {
      setConnection({ ...connection, status }); refreshCaches(); toast.success(status === "accepted" ? "Connection accepted" : "Request declined");
      if (status === "accepted") void sendNotification({ userId: connection.requester_id, type: "partner_accepted", title: "Connection accepted", body: `@${myProfile?.username || "someone"} accepted your request.`, relatedUserId: myId });
    }
    setBusy(false);
  };

  const cancelRequest = async () => {
    if (!connection || busy) return;
    setBusy(true);
    const { error } = await supabase.from("partner_connections").delete().eq("id", connection.id);
    if (error) toast.error("Could not cancel request"); else { setConnection(null); refreshCaches(); toast.success("Request canceled"); }
    setBusy(false);
  };

  const unmatch = async () => {
    if (!connection || !confirm("Unmatch this partner?")) return;
    const { error } = await supabase.from("partner_connections").delete().eq("id", connection.id);
    if (error) toast.error("Failed to unmatch"); else { setConnection(null); setShowMenu(false); refreshCaches(); toast.success("Unmatched"); }
  };

  const toggleBlock = async () => {
    if (!myId || !userId) return;
    if (isBlocked) {
      await supabase.from("blocked_users").delete().eq("blocker_id", myId).eq("blocked_id", userId);
      setIsBlocked(false); toast.success("Trader unblocked");
    } else {
      if (!confirm(`Block @${profile?.username || "this trader"}?`)) return;
      await supabase.from("blocked_users").insert({ blocker_id: myId, blocked_id: userId });
      if (connection) await supabase.from("partner_connections").delete().eq("id", connection.id);
      setConnection(null); setIsBlocked(true); toast.success("Trader blocked");
    }
    setShowMenu(false);
  };

  if (loading) return <AppLayout lockHeight><div className="flex flex-1 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></AppLayout>;
  if (!profile) return <AppLayout><div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><p className="font-bold text-foreground">Profile unavailable</p><Button variant="link" onClick={handleBack}>Go back</Button></div></AppLayout>;

  const incoming = connection?.status === "pending" && connection.requester_id === userId;
  const outgoing = connection?.status === "pending" && connection.requester_id === myId;
  const accepted = connection?.status === "accepted";

  const roundBtn = "h-10 w-10 rounded-full border-surface-line bg-background/60 backdrop-blur-md";
  const back = <Button variant="outline" size="icon" className={roundBtn} onClick={handleBack} aria-label="Back"><ChevronLeft className="h-5 w-5" /></Button>;
  const options = (
    <div className="relative">
      <Button variant="outline" size="icon" className={roundBtn} onClick={() => setShowMenu((v) => !v)} aria-label="Profile options"><MoreVertical className="h-4 w-4" /></Button>
      {showMenu && <div className="absolute right-0 top-11 z-30 min-w-[160px] overflow-hidden rounded-md border border-surface-line bg-surface-raised shadow-lg">{accepted && <Button variant="ghost" className="w-full justify-start rounded-none text-xs" onClick={unmatch}>Unmatch</Button>}<Button variant="ghost" className={cn("w-full justify-start rounded-none text-xs", !isBlocked && "text-destructive")} onClick={toggleBlock}>{isBlocked ? "Unblock" : "Block"}</Button></div>}
    </div>
  );
  const ctaCls = "h-10 flex-1 rounded-full text-[14px] font-semibold";
  const primaryAction = isBlocked ? <Button variant="secondary" className={ctaCls} onClick={toggleBlock}><ShieldOff />Unblock</Button>
    : accepted ? <Button className={ctaCls} onClick={() => navigate(`/messages?partner=${userId}`)}><MessageSquare />Message</Button>
    : outgoing ? <Button variant="secondary" className={ctaCls} onClick={cancelRequest} disabled={busy}><Check />Requested</Button>
    : incoming ? <div className="flex flex-1 gap-2"><Button className={ctaCls} onClick={() => updateRequest("accepted")} disabled={busy}><Check />Accept</Button><Button variant="outline" className={cn(ctaCls, "border-surface-line")} onClick={() => updateRequest("declined")} disabled={busy}><X />Decline</Button></div>
    : <Button className={ctaCls} onClick={sendRequest} disabled={busy}><UserPlus />Connect</Button>;
  const cta = (
    <div className="flex items-center gap-2.5">
      {primaryAction}
      <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full border-surface-line bg-surface" onClick={() => setShowMenu((v) => !v)} aria-label="More options"><MoreHorizontal className="h-5 w-5" /></Button>
    </div>
  );

  return (
    <AppLayout hideBottomNav lockHeight>
      <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
        {activeTab === "journal" && <ProfileHero compact profile={profile} tradingProfile={tradingProfile} topLeft={back} topRight={options} />}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {activeTab === "details" ? (
            <>
              <ProfileHero profile={profile} tradingProfile={tradingProfile} topLeft={back} topRight={options} cta={cta} />
              <TraderDetailsPanel profile={profile} tradingProfile={tradingProfile} match={compatibility} myTrading={myTrading} username={profile.username} />
            </>
          ) : <ProfileJournalCards entries={journalEntries} />}
        </main>
        <ProfileBottomNav active={activeTab} onChange={setActiveTab} className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    </AppLayout>
  );
}