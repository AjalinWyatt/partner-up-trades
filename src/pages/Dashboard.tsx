import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Calendar, Notebook, Flame, ChevronRight, Bell, MessageCircle, ThumbsUp, AlarmClock, CheckCheck, Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { timeAgo } from "@/lib/matchUtils";
import { FREE_PARTNER_LIMIT, isProMember } from "@/lib/partnerLimits";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  prefix?: React.ReactNode;
  onClick?: () => void;
}

const StatCard = ({ title, value, subtitle, icon, prefix, onClick }: StatCardProps) => {
  const Tag: any = onClick ? "button" : "div";
  return (
  <Tag
    onClick={onClick}
    className={`bg-card border border-border rounded-2xl p-3 flex flex-col justify-between min-h-[88px] text-left ${onClick ? "hover:border-accent/40 transition-colors" : ""}`}
  >
    <div className="flex items-start justify-between">
      <span className="text-[12px] font-bold text-foreground">{title}</span>
      <span className="text-muted-foreground/60">{icon}</span>
    </div>
    <div className="flex items-center gap-1 mt-0.5">
      {prefix}
      <span className="text-[24px] font-black text-accent leading-none">{value}</span>
    </div>
    <span className="text-[10px] text-muted-foreground mt-1">{subtitle}</span>
  </Tag>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { loading: guardLoading } = useOnboardingGuard();

  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [stats, setStats] = useState({ savedYou: 0, savedTotal: 0, waiting: 0, streak: 0, maxStreak: 0, logs: 0, activeStreaks: 0 });
  const [updates, setUpdates] = useState<{ id: string; text: string; created_at: string; route: string }[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const [
        { data: prof },
        { count: savedYouCount },
        { count: savedByMeCount },
        { data: entries },
        { data: notifs },
        { count: pendingRequests },
      ] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("saved_profiles").select("*", { count: "exact", head: true }).eq("saver_id", user.id),
        supabase.from("saved_profiles").select("*", { count: "exact", head: true }).eq("saver_id", user.id),
        supabase.from("journal_entries").select("id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("partner_connections").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("status", "pending"),
      ]);

      setProfile(prof || null);

      // Waiting list count: pending requests that overflow the user's partner cap
      let waitingCount = 0;
      try {
        const { count: acceptedCount } = await supabase
          .from("partner_connections")
          .select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq("status", "accepted");
        const accepted = acceptedCount || 0;
        const pending = pendingRequests || 0;
        const pro = await isProMember(user.id);
        const freeSlotsLeft = Math.max(0, FREE_PARTNER_LIMIT - accepted);
        waitingCount = pro ? 0 : Math.max(0, pending - freeSlotsLeft);
      } catch (e) {
        console.error("waiting calc failed", e);
      }

      // Streak calculations
      const days = new Set((entries || []).map(e => e.created_at.slice(0, 10)));
      let streak = 0;
      let cur = new Date();
      for (let i = 0; i < 365; i++) {
        if (days.has(cur.toISOString().slice(0, 10))) { streak++; cur = new Date(cur.getTime() - 86400000); } else break;
      }
      // Max streak - scan ordered set
      const sortedDays = [...days].sort();
      let maxStreak = 0, run = 0, prevDate: Date | null = null;
      for (const d of sortedDays) {
        const dt = new Date(d);
        if (prevDate && (dt.getTime() - prevDate.getTime()) === 86400000) run++;
        else run = 1;
        if (run > maxStreak) maxStreak = run;
        prevDate = dt;
      }

      setStats({
        savedYou: savedYouCount || 0,
        savedTotal: savedByMeCount || 0,
        waiting: waitingCount,
        streak,
        maxStreak,
        logs: entries?.length || 0,
        activeStreaks: streak > 0 ? 1 : 0,
      });

      // Build updates feed (logs missing, pending requests, partner activity)
      const upd: { id: string; text: string; created_at: string; route: string }[] = [];
      const todayStr = new Date().toISOString().slice(0, 10);
      // Only count missing log days BETWEEN account creation and yesterday.
      // Today is excluded because the day isn't over yet.
      const joinedAt = user.created_at ? new Date(user.created_at) : new Date();
      const joinedStr = joinedAt.toISOString().slice(0, 10);
      let missing = 0;
      let chk = new Date(Date.now() - 86400000); // start at yesterday
      for (let i = 0; i < 7; i++) {
        const ds = chk.toISOString().slice(0, 10);
        if (ds < joinedStr) break; // don't count days before signup
        if (!days.has(ds)) missing++;
        chk = new Date(chk.getTime() - 86400000);
      }
      // Don't nag if they already logged today either
      const loggedToday = days.has(todayStr);
      if (missing > 0 && !loggedToday) {
        upd.push({ id: "missing-logs", text: `${missing} day${missing > 1 ? "s" : ""} logs missing - Enter now.`, created_at: new Date().toISOString(), route: "/trading-log" });
      }
      if (pendingRequests && pendingRequests > 0) {
        upd.push({ id: "pending-reqs", text: `${pendingRequests} Pending Add request${pendingRequests > 1 ? "s" : ""}`, created_at: new Date().toISOString(), route: "/partners" });
      }
      // New matching traders joined recently
      try {
        const { data: myTp } = await supabase
          .from("trading_profiles")
          .select("markets")
          .eq("user_id", user.id)
          .maybeSingle();
        const myMarkets = (myTp?.markets || []) as string[];
        if (myMarkets.length > 0) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
          // Build the same exclusion set Discover uses so the count stays consistent
          const [{ data: allConnections }, { data: blockedData }, { data: passedData }] = await Promise.all([
            supabase
              .from("partner_connections")
              .select("requester_id, receiver_id")
              .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
              .in("status", ["pending", "accepted"]),
            supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
            supabase.from("passed_profiles").select("passed_id").eq("passer_id", user.id),
          ]);
          const excludedIds = new Set<string>([user.id]);
          (allConnections || []).forEach((c: any) => { excludedIds.add(c.requester_id); excludedIds.add(c.receiver_id); });
          (blockedData || []).forEach((b: any) => excludedIds.add(b.blocked_id));
          (passedData || []).forEach((p: any) => excludedIds.add(p.passed_id));

          const { data: rawMatches } = await supabase
            .from("trading_profiles")
            .select("user_id, markets, created_at")
            .neq("user_id", user.id)
            .gte("created_at", sevenDaysAgo)
            .overlaps("markets", myMarkets)
            .limit(50);
          const candidateIds = (rawMatches || [])
            .map((m: any) => m.user_id)
            .filter((id: string) => !excludedIds.has(id));
          // Only count users who completed onboarding (Discover requirement)
          const { data: validProfiles } = candidateIds.length > 0
            ? await supabase.from("profiles").select("id").in("id", candidateIds).eq("onboarding_completed", true)
            : { data: [] as any[] };
          const validIds = new Set((validProfiles || []).map((p: any) => p.id));
          const newMatches = (rawMatches || []).filter((m: any) => validIds.has(m.user_id));
          const matchCount = newMatches.length;
          if (matchCount > 0) {
            upd.push({
              id: "new-matches",
              text: `${matchCount} new trader${matchCount > 1 ? "s" : ""} that match you joined - View in Discover`,
              created_at: newMatches[0].created_at as string,
              route: "/discover",
            });
          }
        }
      } catch (e) { console.error("new matches calc failed", e); }
      // Partner shared logs (latest 1)
      const { data: myConns } = await supabase
        .from("partner_connections")
        .select("requester_id, receiver_id")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("status", "accepted");
      const partnerIds = (myConns || []).map((c: any) => c.requester_id === user.id ? c.receiver_id : c.requester_id);
      if (partnerIds.length > 0) {
        const { data: sharedLog } = await supabase
          .from("journal_entries")
          .select("id, user_id, created_at")
          .in("user_id", partnerIds)
          .eq("share_setting", "partners")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sharedLog) {
          upd.push({
            id: `shared-${sharedLog.id}`,
            text: "Your partner just shared a log, View.",
            created_at: sharedLog.created_at,
            route: "/trading-log",
          });
        }
      }
      setUpdates(upd);

      // Notifications - enrich with actor names
      const ns = notifs || [];
      if (ns.length > 0) {
        const actorIds = [...new Set(ns.map(n => n.actor_id))];
        const { data: actors } = await supabase.from("profiles").select("id, username").in("id", actorIds);
        const actorMap = new Map((actors || []).map(a => [a.id, a]));
        setNotifications(ns.map(n => ({ ...n, actorUsername: actorMap.get(n.actor_id)?.username })));
      }

      setLoading(false);
    };
    load();
  }, []);

  if (guardLoading || loading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const notifIcon = (type: string) => {
    if (type === "post_commented" || type === "comment") return <MessageCircle className="w-4 h-4 text-accent" />;
    if (type === "post_liked" || type === "like") return <ThumbsUp className="w-4 h-4 text-accent" />;
    return <AlarmClock className="w-4 h-4 text-accent" />;
  };

  const notifText = (n: any) => {
    if (n.title) return n.title;
    const who = n.actorUsername ? `@${n.actorUsername}` : "Someone";
    if (n.type === "post_commented" || n.type === "comment") return `${who} commented on your post`;
    if (n.type === "post_liked" || n.type === "like") return `${who} liked your post`;
    if (n.type === "partner_request") return `${who} sent you a partner request`;
    if (n.type === "partner_accepted") return `${who} accepted your partner request`;
    return `${who} interacted with you`;
  };

  return (
    <AppLayout>
      <AppHeader />
      <div className="flex-1 overflow-y-auto pb-20 px-5 pt-2">
        <p className="text-[14px] text-muted-foreground mb-4">
          Welcome back{profile?.username ? `, @${profile.username}` : ""}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard
            title="My Saved"
            value={stats.savedYou}
            subtitle="Who you saved"
            icon={<Inbox className="w-5 h-5" strokeWidth={1.6} />}
            onClick={() => navigate("/saved")}
          />
          <StatCard
            title="Waiting List"
            value={stats.waiting}
            subtitle={stats.waiting > 0 ? "Tap to unlock" : "All clear"}
            icon={<Lock className="w-5 h-5" strokeWidth={1.6} />}
            onClick={() => navigate("/waiting-list")}
          />
          <StatCard
            title="Daily Streak"
            value={stats.streak}
            subtitle={`Max ${stats.maxStreak}`}
            icon={<Calendar className="w-4 h-4" strokeWidth={1.6} />}
            prefix={<Flame className="w-5 h-5 text-destructive" fill="currentColor" />}
          />
          <StatCard
            title="My Logs"
            value={stats.logs}
            subtitle={`${stats.activeStreaks} Active`}
            icon={<Notebook className="w-5 h-5" strokeWidth={1.6} />}
            onClick={() => navigate("/trading-log")}
          />
        </div>

        {/* Updates */}
        {updates.length > 0 && (
          <div className="mb-8">
            <div className="w-full flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-black text-foreground">Updates</h2>
            </div>
            <div className="space-y-2">
              {updates.map(u => (
                <button
                  key={u.id}
                  onClick={() => navigate(u.route)}
                  className="w-full bg-card/60 border border-border rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-card/80 transition-colors"
                >
                  <CheckCheck className="w-5 h-5 text-accent shrink-0" />
                  <span className="flex-1 text-[13px] text-foreground">{u.text}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(u.created_at)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        <div>
          <button
            onClick={() => navigate("/notifications")}
            className="w-full flex items-center justify-between mb-3"
          >
            <h2 className="text-[18px] font-black text-foreground">Notifications</h2>
            <ChevronRight className="w-5 h-5 text-accent" />
          </button>
          {notifications.length === 0 ? (
            <div className="bg-card/40 border border-border rounded-xl p-4 text-center">
              <Bell className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">No new notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map(n => (
                <button
                  key={n.id}
                  onClick={() => navigate("/notifications")}
                  className="w-full bg-card/60 border border-border rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-card/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    {notifIcon(n.type)}
                  </div>
                  <span className="flex-1 text-[13px] text-foreground line-clamp-1">{notifText(n)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
