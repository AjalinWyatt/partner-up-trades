import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Bell, MessageSquare, Check, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

interface Alert {
  userId: string;
  name: string;
  text: string;
  sub: string;
}

interface PendingRequest {
  connectionId: string;
  userId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  markets: string[];
  sessions: string[];
  matchScore: number;
}

interface PartnerRow {
  connectionId: string;
  userId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  markets: string[];
  sessions: string[];
  strategies: string[];
  streak: number;
  lastActive: string;
  loggedToday: boolean;
}

const Partners = () => {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setMyId(user.id);

      // Pending requests where I am the receiver
      const { data: pendingData } = await supabase
        .from("partner_connections")
        .select("id, requester_id, match_score")
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      // Accepted connections
      const { data: acceptedData } = await supabase
        .from("partner_connections")
        .select("id, requester_id, receiver_id, match_score")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("status", "accepted");

      // Collect all partner user IDs
      const pendingIds = (pendingData || []).map(p => p.requester_id);
      const acceptedIds = (acceptedData || []).map(c =>
        c.requester_id === user.id ? c.receiver_id : c.requester_id
      );
      const allIds = [...new Set([...pendingIds, ...acceptedIds])];

      if (allIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", allIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch trading profiles
      const { data: tradingProfiles } = await supabase
        .from("trading_profiles")
        .select("user_id, markets, sessions, strategies")
        .in("user_id", allIds);
      const tradingMap = new Map((tradingProfiles || []).map(t => [t.user_id, t]));

      // Build pending requests
      const pendingRows: PendingRequest[] = (pendingData || []).map(p => {
        const prof = profileMap.get(p.requester_id);
        const tp = tradingMap.get(p.requester_id);
        return {
          connectionId: p.id,
          userId: p.requester_id,
          name: prof?.full_name || prof?.username || "Trader",
          initials: getInitials(prof?.full_name),
          avatarUrl: prof?.avatar_url || null,
          markets: tp?.markets || [],
          sessions: tp?.sessions || [],
          matchScore: p.match_score || 0,
        };
      });
      setPending(pendingRows);

      // Build accepted partners with streaks and alerts
      const today = new Date().toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      const alertList: Alert[] = [];
      const partnerRows: PartnerRow[] = [];

      for (const id of acceptedIds) {
        const prof = profileMap.get(id);
        const tp = tradingMap.get(id);
        const conn = (acceptedData || []).find(c =>
          (c.requester_id === id || c.receiver_id === id) && c.requester_id !== c.receiver_id
        );

        // Fetch journal entries for this partner
        const { data: entries } = await supabase
          .from("journal_entries")
          .select("created_at, result, mood")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(30);

        const lastEntry = entries?.[0];
        const lastActive = lastEntry ? timeAgo(lastEntry.created_at) : "No activity";
        const loggedToday = lastEntry ? lastEntry.created_at.slice(0, 10) === today : false;

        // Calculate streak (consecutive days with entries)
        let streak = 0;
        if (entries && entries.length > 0) {
          const days = new Set(entries.map(e => e.created_at.slice(0, 10)));
          let d = new Date();
          for (let i = 0; i < 30; i++) {
            const ds = d.toISOString().slice(0, 10);
            if (days.has(ds)) {
              streak++;
              d = new Date(d.getTime() - 86400000);
            } else break;
          }
        }

        // Check alerts: hasn't logged in 2+ days
        if (!lastEntry || lastEntry.created_at < twoDaysAgo) {
          alertList.push({
            userId: id,
            name: prof?.full_name || prof?.username || "Partner",
            text: "hasn't logged in 2+ days",
            sub: "Send a check-in message",
          });
        }

        // Check alerts: 3+ consecutive losses/rough moods
        if (entries && entries.length >= 3) {
          const last3 = entries.slice(0, 3);
          const allRough = last3.every(e =>
            e.result === "Loss" || e.mood === "Frustrated" || e.mood === "Anxious" || e.mood === "Tired"
          );
          if (allRough) {
            alertList.push({
              userId: id,
              name: prof?.full_name || "Partner",
              text: "is on a rough streak",
              sub: "3+ consecutive losses or tough sessions",
            });
          }
        }

        partnerRows.push({
          connectionId: conn?.id || "",
          userId: id,
          name: prof?.full_name || "Trader",
          initials: getInitials(prof?.full_name),
          avatarUrl: prof?.avatar_url || null,
          markets: tp?.markets || [],
          sessions: tp?.sessions || [],
          strategies: tp?.strategies || [],
          streak,
          lastActive: lastEntry ? `Logged ${timeAgo(lastEntry.created_at)}` : "No logs yet",
          loggedToday,
        });
      }

      setAlerts(alertList);
      setPartners(partnerRows);
      setLoading(false);
    };
    load();
  }, []);

  const handleAccept = async (connectionId: string, requesterId: string) => {
    const { error } = await supabase
      .from("partner_connections")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", connectionId);
    if (error) {
      toast.error("Failed to accept request");
      return;
    }
    toast.success("Partner request accepted!");
    setPending(prev => prev.filter(p => p.connectionId !== connectionId));
    // Notify the requester
    if (myId) {
      const { data: myProf } = await supabase.from("profiles").select("full_name").eq("id", myId).single();
      const myName = myProf?.full_name || "Someone";
      await sendNotification({
        userId: requesterId,
        type: "partner_accepted",
        title: "Connection accepted 🎉",
        body: `${myName} accepted your request. Say hi!`,
        relatedUserId: myId,
      });
    }
  };

  const handleDecline = async (connectionId: string) => {
    const { error } = await supabase
      .from("partner_connections")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", connectionId);
    if (error) {
      toast.error("Failed to decline request");
      return;
    }
    toast.success("Request declined");
    setPending(prev => prev.filter(p => p.connectionId !== connectionId));
  };

  const isEmpty = alerts.length === 0 && pending.length === 0 && partners.length === 0;

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
        <div className="px-5 pt-4 pb-2">
          <h1 className="text-lg font-black text-foreground">Partners</h1>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No partners yet — find your match</p>
            <p className="text-xs text-muted-foreground max-w-[240px] mb-4">Find your accountability partner and start building streaks together.</p>
            <button
              onClick={() => navigate("/discover")}
              className="px-6 py-2.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
            >
              Find Partners
            </button>
          </div>
        ) : (
          <div className="px-5 space-y-4 pb-8">
            {/* Alerts */}
            {alerts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alerts</span>
                </div>
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5" style={{ background: "rgba(228,92,45,0.08)", border: "1px solid rgba(228,92,45,0.2)" }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(228,92,45,0.12)" }}>
                      <Bell className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground">{a.name} {a.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{a.sub}</div>
                    </div>
                    <button
                      onClick={() => navigate(`/messages`)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-orange-500 shrink-0"
                      style={{ background: "rgba(228,92,45,0.15)" }}
                    >
                      Check in
                    </button>
                  </div>
                ))}
              </section>
            )}

            {/* Pending Requests */}
            {pending.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Requests</span>
                  <span className="text-[11px] text-muted-foreground">{pending.length}</span>
                </div>
                {pending.map((r) => (
                  <div key={r.connectionId} className="flex items-center gap-2.5 p-2.5 bg-card border border-border rounded-xl mb-1.5">
                    <button onClick={() => navigate(`/profile/${r.userId}`)} className="shrink-0">
                      {r.avatarUrl ? (
                        <img src={r.avatarUrl} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-black text-primary-foreground">{r.initials}</div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {r.markets.slice(0, 2).join(", ")}{r.sessions.length > 0 ? ` · ${r.sessions[0]}` : ""}
                      </div>
                      <div className="text-[10px] font-extrabold text-success mt-0.5">{r.matchScore}% match</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDecline(r.connectionId)}
                        className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleAccept(r.connectionId, r.userId)}
                        className="px-3 h-8 rounded-lg bg-gradient-to-r from-primary to-success flex items-center justify-center gap-1 text-[10px] font-bold text-primary-foreground"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* My Partners */}
            {partners.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Partners</span>
                  <span className="text-[11px] text-muted-foreground">{partners.length}</span>
                </div>
                {partners.map((p) => (
                  <div
                    key={p.connectionId}
                    className="flex items-center gap-2.5 p-2.5 bg-card border border-border rounded-xl mb-1.5 cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => navigate(`/profile/${p.userId}`)}
                  >
                    <div className="relative">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[13px] font-black text-primary-foreground">{p.initials}</div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${p.loggedToday ? "bg-success" : "bg-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-foreground truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {p.markets.slice(0, 2).join(", ")}{p.sessions.length > 0 ? ` · ${p.sessions[0]}` : ""}{p.strategies.length > 0 ? ` · ${p.strategies[0]}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`flex items-center gap-1 text-sm font-extrabold ${p.loggedToday ? "text-success" : "text-muted-foreground"}`}>
                        ⚡ {p.streak}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{p.lastActive}</div>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Partners;
