import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Calendar, Notebook, Flame, Bell, MessageCircle, ThumbsUp, AlarmClock, CheckCheck, Lock, Heart, UserPlus, UserCheck, Eye, Target, AlertTriangle, BookOpen as BookOpenIcon } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { timeAgo } from "@/lib/matchUtils";
import { FREE_PARTNER_LIMIT, isProMember } from "@/lib/partnerLimits";
import { getDiscoverMatches } from "@/lib/discoverMatches";
import { Skeleton } from "@/components/ui/skeleton";
import Walkthrough from "@/components/Walkthrough";

type NotifFilter = "all" | "activity" | "partners" | "streaks";

const NOTIF_FILTERS: { key: NotifFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "activity", label: "Activity" },
  { key: "partners", label: "Partners" },
  { key: "streaks", label: "Streaks" },
];

const NOTIF_FILTER_TYPES: Record<NotifFilter, string[]> = {
  all: [],
  activity: ["post_liked", "post_commented", "profile_viewed", "new_match", "like", "comment"],
  partners: ["partner_request", "partner_accepted", "partner_inactive", "partner_support", "partner_logged"],
  streaks: ["streak_warning", "streak_milestone"],
};

const NOTIF_EMPTY_STATES: Record<NotifFilter, { icon: React.ReactNode; title: string; body: string }> = {
  all: {
    icon: <Bell className="w-5 h-5 text-muted-foreground" />,
    title: "You're all caught up ✓",
    body: "When someone interacts with you, it'll show up here.",
  },
  activity: {
    icon: <Heart className="w-5 h-5 text-muted-foreground" />,
    title: "No activity yet",
    body: "Likes, comments, profile views, and new matches will appear here.",
  },
  partners: {
    icon: <UserPlus className="w-5 h-5 text-muted-foreground" />,
    title: "Nothing from partners yet",
    body: "Partner requests, acceptances, and check-ins will land here.",
  },
  streaks: {
    icon: <Flame className="w-5 h-5 text-muted-foreground" />,
    title: "No streak alerts",
    body: "We'll nudge you here when your streak is at risk or you hit a milestone.",
  },
};

const NOTIF_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; route: string }> = {
  partner_request:  { icon: <UserPlus className="w-4 h-4" />,       color: "text-primary bg-primary/15",         route: "/partners" },
  partner_accepted: { icon: <UserCheck className="w-4 h-4" />,      color: "text-success bg-success/15",         route: "/messages" },
  partner_inactive: { icon: <AlertTriangle className="w-4 h-4" />,  color: "text-orange-400 bg-orange-400/15",   route: "/messages" },
  partner_support:  { icon: <Heart className="w-4 h-4" />,          color: "text-destructive bg-destructive/15", route: "/messages" },
  post_liked:       { icon: <Heart className="w-4 h-4" />,          color: "text-destructive bg-destructive/15", route: "/feed" },
  post_commented:   { icon: <MessageCircle className="w-4 h-4" />,  color: "text-primary bg-primary/15",         route: "/feed" },
  profile_viewed:   { icon: <Eye className="w-4 h-4" />,            color: "text-accent-foreground bg-accent/15", route: "/partners" },
  new_match:        { icon: <Target className="w-4 h-4" />,         color: "text-success bg-success/15",         route: "/discover" },
  streak_warning:   { icon: <Flame className="w-4 h-4" />,          color: "text-orange-400 bg-orange-400/15",   route: "/trading-log" },
  streak_milestone: { icon: <Flame className="w-4 h-4" />,          color: "text-success bg-success/15",         route: "/trading-log" },
  partner_logged:   { icon: <BookOpenIcon className="w-4 h-4" />,   color: "text-primary bg-primary/15",         route: "/trading-log" },
  like:             { icon: <Heart className="w-4 h-4" />,          color: "text-destructive bg-destructive/15", route: "/feed" },
  comment:          { icon: <MessageCircle className="w-4 h-4" />,  color: "text-primary bg-primary/15",         route: "/feed" },
};

const fallbackNotifText = (type: string) => {
  switch (type) {
    case "like": case "post_liked": return "liked your post";
    case "comment": case "post_commented": return "commented on your post";
    case "partner_request": return "sent you a partner request";
    case "partner_accepted": return "accepted your partner request";
    default: return "interacted with you";
  }
};

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
  const [notifFilter, setNotifFilter] = useState<NotifFilter>("all");
  const [notifLoading, setNotifLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  const loadNotifications = async (uid: string, filter: NotifFilter) => {
    setNotifLoading(true);
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    const types = NOTIF_FILTER_TYPES[filter];
    if (types.length > 0) query = query.in("type", types);
    const { data: ns } = await query;
    if (!ns || ns.length === 0) {
      setNotifications([]);
      setNotifLoading(false);
      return;
    }
    const actorIds = [...new Set(ns.map((n: any) => n.actor_id))];
    const { data: actors } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", actorIds);
    const actorMap = new Map((actors || []).map((a: any) => [a.id, a]));
    setNotifications(ns.map((n: any) => {
      const a = actorMap.get(n.actor_id);
      return { ...n, actorUsername: a?.username, actorAvatar: a?.avatar_url || null };
    }));
    setNotifLoading(false);
  };

  useEffect(() => {
    if (userId) loadNotifications(userId, notifFilter);
  }, [notifFilter, userId]);

  // Realtime: refresh the dashboard notifications list whenever a new
  // notification is inserted, updated, or deleted for this user.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`dashboard-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications(userId, notifFilter);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, notifFilter]);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotifClick = async (n: any) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    const config = NOTIF_TYPE_CONFIG[n.type] || NOTIF_TYPE_CONFIG.like;
    navigate(config.route);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      setUserId(user.id);

      const [
        { data: prof },
        { count: savedYouCount },
        { count: savedByMeCount },
        { data: entries },
        { data: notifs },
        { count: pendingRequests },
      ] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url, tour_completed").eq("id", user.id).maybeSingle(),
        supabase.from("saved_profiles").select("*", { count: "exact", head: true }).eq("saver_id", user.id),
        supabase.from("saved_profiles").select("*", { count: "exact", head: true }).eq("saver_id", user.id),
        supabase.from("journal_entries").select("id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("partner_connections").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("status", "pending"),
      ]);

      setProfile(prof || null);
      // Trigger first-time walkthrough or replay flag from Settings
      const replay = sessionStorage.getItem("tw:replay-tour") === "1";
      if (replay || (prof && (prof as any).tour_completed === false)) {
        sessionStorage.removeItem("tw:replay-tour");
        // Small delay so the layout settles before we measure nav items
        setTimeout(() => setShowTour(true), 300);
      }

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
      // New matching traders joined recently — calculated from the exact same source Discover renders.
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { matches: newMatches } = await getDiscoverMatches(user.id, { joinedAfter: sevenDaysAgo });
        const matchCount = newMatches.length;
        if (matchCount > 0) {
          upd.push({
            id: "new-matches",
            text: `${matchCount} new trader${matchCount > 1 ? "s" : ""} available in Discover`,
            created_at: newMatches[0].created_at || new Date().toISOString(),
            route: "/discover",
          });
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

      // Notifications - enrich with actor names (initial load uses 'all' filter)
      const ns = notifs || [];
      if (ns.length > 0) {
        const actorIds = [...new Set(ns.map(n => n.actor_id))];
        const { data: actors } = await supabase.from("profiles").select("id, username, avatar_url").in("id", actorIds);
        const actorMap = new Map((actors || []).map(a => [a.id, a]));
        setNotifications(ns.map(n => ({ ...n, actorUsername: actorMap.get(n.actor_id)?.username, actorAvatar: actorMap.get(n.actor_id)?.avatar_url || null })));
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

  const getNotifTitle = (n: any) => {
    if (n.title) return n.title;
    const who = n.actorUsername ? `@${n.actorUsername}` : "Someone";
    return `${who} ${fallbackNotifText(n.type)}`;
  };
  const getNotifBody = (n: any) => n.body || fallbackNotifText(n.type);
  const unreadCount = notifications.filter(n => !n.read).length;

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
          <div className="w-full flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-black text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-primary font-semibold">
                <CheckCheck className="w-3.5 h-3.5" /> Read all
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            {NOTIF_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setNotifFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  notifFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {notifLoading ? (
            <div className="bg-card/40 border border-border rounded-xl divide-y divide-border overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2 py-1">
                    <Skeleton className="h-3 w-2/3 rounded" />
                    <Skeleton className="h-2.5 w-full rounded" />
                    <Skeleton className="h-2 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            (() => {
              const empty = NOTIF_EMPTY_STATES[notifFilter];
              return (
                <div className="bg-card/40 border border-border rounded-xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                    {empty.icon}
                  </div>
                  <p className="text-[13px] font-semibold text-foreground mb-1">{empty.title}</p>
                  <p className="text-[11px] text-muted-foreground">{empty.body}</p>
                </div>
              );
            })()
          ) : (
            <div className="bg-card/40 border border-border rounded-xl divide-y divide-border overflow-hidden">
              {notifications.map(n => {
                const config = NOTIF_TYPE_CONFIG[n.type] || NOTIF_TYPE_CONFIG.like;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground leading-snug">{getNotifTitle(n)}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{getNotifBody(n)}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showTour && <Walkthrough onClose={() => setShowTour(false)} />}
    </AppLayout>
  );
};

export default Dashboard;
