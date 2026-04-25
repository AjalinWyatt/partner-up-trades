import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Calendar, Notebook, Flame, ChevronRight, Bell, MessageCircle, ThumbsUp, AlarmClock, CheckCheck, Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
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
    className={`bg-card border border-border rounded-2xl p-4 flex flex-col justify-between min-h-[120px] text-left ${onClick ? "hover:border-accent/40 transition-colors" : ""}`}
  >
    <div className="flex items-start justify-between">
      <span className="text-[14px] font-bold text-foreground">{title}</span>
      <span className="text-muted-foreground/60">{icon}</span>
    </div>
    <div className="flex items-center gap-1.5 mt-1">
      {prefix}
      <span className="text-[32px] font-black text-accent leading-none">{value}</span>
    </div>
    <span className="text-[11px] text-muted-foreground mt-2">{subtitle}</span>
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
      let missing = 0;
      let chk = new Date();
      for (let i = 0; i < 7; i++) {
        const ds = chk.toISOString().slice(0, 10);
        if (ds !== todayStr && !days.has(ds)) missing++;
        chk = new Date(chk.getTime() - 86400000);
      }
      if (missing > 0) {
        upd.push({ id: "missing-logs", text: `${missing} day${missing > 1 ? "s" : ""} logs missing - Enter now.`, created_at: new Date().toISOString(), route: "/trading-log" });
      }
      if (pendingRequests && pendingRequests > 0) {
        upd.push({ id: "pending-reqs", text: `${pendingRequests} Pending Add request${pendingRequests > 1 ? "s" : ""}`, created_at: new Date().toISOString(), route: "/partners" });
      }
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
      <div className="flex-1 overflow-y-auto pb-20 px-5 pt-5">
        {/* Welcome header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[16px] text-foreground/90">Welcome Back to</p>
            <h1 className="text-[28px] font-black tracking-tight">
              <span className="text-foreground">Traders</span>
              <span className="text-foreground">World</span>
            </h1>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-border shrink-0"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="me" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-black text-primary-foreground">
                {(profile?.username || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
          </button>
        </div>

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
            icon={<Calendar className="w-5 h-5" strokeWidth={1.6} />}
            prefix={<Flame className="w-7 h-7 text-destructive" fill="currentColor" />}
          />
          <StatCard
            title="My Logs"
            value={stats.logs}
            subtitle={`${stats.activeStreaks} Active`}
            icon={<Notebook className="w-5 h-5" strokeWidth={1.6} />}
          />
        </div>

        {/* Updates */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/trading-log")}
            className="w-full flex items-center justify-between mb-3"
          >
            <h2 className="text-[18px] font-black text-foreground">Updates</h2>
            <ChevronRight className="w-5 h-5 text-accent" />
          </button>
          {updates.length === 0 ? (
            <div className="bg-card/40 border border-border rounded-xl p-4 text-center">
              <p className="text-[12px] text-muted-foreground">You're all caught up ✓</p>
            </div>
          ) : (
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
          )}
        </div>

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
