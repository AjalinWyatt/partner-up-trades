import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  Check,
  ChevronRight,
  Flame,
  MapPin,
  MessageSquare,
  NotebookTabs,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { useSessionCache } from "@/hooks/use-session-cache";
import { timeAgo } from "@/lib/matchUtils";
import { FREE_PARTNER_LIMIT, isProMember } from "@/lib/partnerLimits";
import { getDiscoverMatches } from "@/lib/discoverMatches";
import { getMapTraders, milesBetween, resolveMyApproxLocation } from "@/lib/tradersMap";
import globeImage from "@/assets/auth-globe.png";

type DashboardProfile = {
  username: string | null;
  avatar_url: string | null;
  tour_completed?: boolean | null;
};

type DashboardStats = {
  savedYou: number;
  waiting: number;
  streak: number;
  maxStreak: number;
  logs: number;
  activeStreaks: number;
};

type Update = {
  id: string;
  text: string;
  created_at: string;
  route: string;
};

type DashboardNotification = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  actor_id: string;
  created_at: string;
  read: boolean;
  actorUsername?: string | null;
  actorAvatar?: string | null;
};

type HomePartner = {
  id: string;
  username: string;
  avatarUrl: string | null;
  identity: string;
  streak: number;
  checkedInToday: boolean;
  weeklyCheckinDays: string[];
};

type DailySummary = {
  journalToday: boolean;
  weeklyJournalDays: string[];
  nearbyCount: number;
};

const EMPTY_DAILY: DailySummary = { journalToday: false, weeklyJournalDays: [], nearbyCount: 0 };

const localDay = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfWeek = () => {
  const date = new Date();
  const offset = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  return date;
};

const EMPTY_STATS: DashboardStats = {
  savedYou: 0,
  waiting: 0,
  streak: 0,
  maxStreak: 0,
  logs: 0,
  activeStreaks: 0,
};

const activityRoute = (type: string) => {
  if (type === "partner_request") return "/partners";
  if (type === "partner_accepted") return "/messages";
  if (type === "partner_logged" || type.startsWith("streak_")) return "/trading-log";
  if (type === "new_match") return "/discover";
  return "/dashboard";
};

const activityCopy = (notification: DashboardNotification) => {
  const username = notification.actorUsername ? `@${notification.actorUsername}` : "A trader";
  const fallback: Record<string, { title: string; body: string }> = {
    partner_request: { title: "New connection request", body: `${username} wants to connect with you.` },
    partner_accepted: { title: "Connection accepted", body: `${username} accepted your request.` },
    partner_logged: { title: "Your partner shared a journal", body: "View their latest entry." },
    new_match: { title: "New trader available", body: "Someone new is in your Discover." },
    streak_warning: { title: "Keep your streak going", body: "Add today's journal entry." },
    streak_milestone: { title: "New streak milestone", body: notification.body || "Your consistency is growing." },
  };
  return fallback[notification.type] || {
    title: notification.title || "New activity",
    body: notification.body || "Open to see the latest update.",
  };
};

const ActivityIcon = ({ type }: { type: string }) => {
  const Icon = type === "partner_accepted"
    ? UserCheck
    : type === "partner_request"
      ? UserPlus
      : type === "partner_logged"
        ? NotebookTabs
        : type.startsWith("streak_")
          ? Flame
          : Users;
  return <Icon className="h-5 w-5" strokeWidth={1.8} />;
};

const Stat = ({ icon, value, label, detail, onClick }: {
  icon: ReactNode;
  value: number;
  label: string;
  detail?: string;
  onClick?: () => void;
}) => {
  const content = (
    <>
      <div className="flex h-8 items-center gap-2.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-serif text-[25px] leading-none text-foreground">{value}</span>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{label}</p>
      {detail && <p className="text-[10px] leading-4 text-muted-foreground/70">{detail}</p>}
    </>
  );

  if (!onClick) return <div className="min-w-0 flex-1 px-3 first:pl-0 last:pr-0">{content}</div>;
  return (
    <Button variant="ghost" onClick={onClick} className="h-auto min-w-0 flex-1 justify-start rounded-none px-3 py-0 text-left first:pl-0 last:pr-0 hover:bg-transparent">
      <span className="block">{content}</span>
    </Button>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { loading: guardLoading } = useOnboardingGuard();
  const [profile, setProfile, hadProfileCache] = useSessionCache<DashboardProfile | null>("dashboard:profile", null);
  const [stats, setStats, hadStatsCache] = useSessionCache<DashboardStats>("dashboard:stats", EMPTY_STATS);
  const [updates, setUpdates] = useSessionCache<Update[]>("dashboard:updates", []);
  const [notifications, setNotifications] = useSessionCache<DashboardNotification[]>("dashboard:notifications", []);
  const [partner, setPartner] = useState<HomePartner | null>(null);
  const [daily, setDaily] = useState<DailySummary>(EMPTY_DAILY);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [loading, setLoading] = useState(!(hadProfileCache && hadStatsCache));

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !active) return;

      const [
        { data: prof },
        { count: savedCount },
        { data: entries },
        { data: notifs },
        { count: pendingRequests },
      ] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url, tour_completed").eq("id", user.id).maybeSingle(),
        supabase.from("saved_profiles").select("*", { count: "exact", head: true }).eq("saver_id", user.id),
        supabase.from("journal_entries").select("id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("partner_connections").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("status", "pending"),
      ]);
      if (!active) return;

      setProfile(prof || null);
      const replay = sessionStorage.getItem("tw:replay-tour") === "1";
      if (replay || (prof && prof.tour_completed === false)) {
        sessionStorage.removeItem("tw:replay-tour");
        window.setTimeout(() => {
          sessionStorage.setItem("tw:tour-active", "1");
          window.dispatchEvent(new Event("tw:start-tour"));
        }, 300);
      }

      let waiting = 0;
      const { count: acceptedCount } = await supabase
        .from("partner_connections")
        .select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("status", "accepted");
      const pro = await isProMember(user.id);
      waiting = pro ? 0 : Math.max(0, (pendingRequests || 0) - Math.max(0, FREE_PARTNER_LIMIT - (acceptedCount || 0)));

      const days = new Set((entries || []).map((entry) => entry.created_at.slice(0, 10)));
      let streak = 0;
      let cursor = new Date();
      for (let index = 0; index < 365; index += 1) {
        if (!days.has(cursor.toISOString().slice(0, 10))) break;
        streak += 1;
        cursor = new Date(cursor.getTime() - 86_400_000);
      }
      let maxStreak = 0;
      let run = 0;
      let previous: Date | null = null;
      [...days].sort().forEach((day) => {
        const date = new Date(day);
        run = previous && date.getTime() - previous.getTime() === 86_400_000 ? run + 1 : 1;
        maxStreak = Math.max(maxStreak, run);
        previous = date;
      });
      setStats({
        savedYou: savedCount || 0,
        waiting,
        streak,
        maxStreak,
        logs: entries?.length || 0,
        activeStreaks: streak > 0 ? 1 : 0,
      });

      const weekStart = startOfWeek();
      const weekStartIso = weekStart.toISOString();
      const today = localDay(new Date());
      const weeklyJournalDays = [...days].filter((day) => day >= localDay(weekStart));

      const { data: accepted } = await supabase
        .from("partner_connections")
        .select("requester_id, receiver_id, updated_at")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("status", "accepted")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (accepted) {
        const partnerId = accepted.requester_id === user.id ? accepted.receiver_id : accepted.requester_id;
        const [{ data: partnerProfile }, { data: partnerTrading }, { data: partnerStreak }, { data: weekMessages }] = await Promise.all([
          supabase.from("profiles").select("username, full_name, avatar_url").eq("id", partnerId).maybeSingle(),
          supabase.from("trading_profiles").select("markets, trading_style, experience_level").eq("user_id", partnerId).maybeSingle(),
          supabase.rpc("get_partner_checkin_streak", { user_a: user.id, user_b: partnerId }),
          supabase.from("messages").select("sender_id, receiver_id, created_at").or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`).gte("created_at", weekStartIso),
        ]);
        const directions = new Map<string, Set<string>>();
        (weekMessages || []).forEach((message) => {
          const day = localDay(message.created_at);
          const senders = directions.get(day) || new Set<string>();
          senders.add(message.sender_id);
          directions.set(day, senders);
        });
        const weeklyCheckinDays = [...directions.entries()].filter(([, senders]) => senders.has(user.id) && senders.has(partnerId)).map(([day]) => day);
        const identity = [partnerTrading?.markets?.[0], partnerTrading?.trading_style?.[0], partnerTrading?.experience_level].filter(Boolean).join(" · ");
        setPartner({
          id: partnerId,
          username: partnerProfile?.username ? `@${partnerProfile.username}` : partnerProfile?.full_name || "Partner",
          avatarUrl: partnerProfile?.avatar_url || null,
          identity: identity || "Trading partner",
          streak: Number(partnerStreak) || 0,
          checkedInToday: weeklyCheckinDays.includes(today),
          weeklyCheckinDays,
        });
      } else {
        setPartner(null);
      }

      let nearbyCount = 0;
      try {
        const location = await resolveMyApproxLocation(user.id);
        if (location) {
          const nearbyTraders = await getMapTraders(user.id);
          nearbyCount = nearbyTraders.filter((trader) => milesBetween(location, { lat: trader.lat, lng: trader.lng }) <= 50).length;
        }
      } catch (error) {
        console.error("nearby count failed", error);
      }
      setDaily({ journalToday: days.has(today), weeklyJournalDays, nearbyCount });

      const nextUpdates: Update[] = [];
      if (!days.has(today)) {
        nextUpdates.push({ id: "journal-today", text: "Today's journal entry is ready", created_at: new Date().toISOString(), route: "/trading-log" });
      }
      try {
        const { matches } = await getDiscoverMatches(user.id, { joinedAfter: new Date(Date.now() - 7 * 86_400_000).toISOString() });
        if (matches.length > 0) {
          nextUpdates.push({ id: "new-matches", text: `${matches.length} new trader${matches.length === 1 ? "" : "s"} available`, created_at: matches[0].created_at || new Date().toISOString(), route: "/discover" });
        }
      } catch (error) {
        console.error("new matches calc failed", error);
      }
      setUpdates(nextUpdates);

      const recent = (notifs || []) as DashboardNotification[];
      if (recent.length > 0) {
        const actorIds = [...new Set(recent.map((notification) => notification.actor_id).filter(Boolean))];
        const { data: actors } = actorIds.length
          ? await supabase.from("profiles").select("id, username, avatar_url").in("id", actorIds)
          : { data: [] };
        const actorMap = new Map((actors || []).map((actor) => [actor.id, actor]));
        setNotifications(recent.map((notification) => ({
          ...notification,
          actorUsername: actorMap.get(notification.actor_id)?.username,
          actorAvatar: actorMap.get(notification.actor_id)?.avatar_url || null,
        })));
      } else {
        setNotifications([]);
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const activity = useMemo(() => {
    const notificationRows = notifications.map((notification) => ({
      id: notification.id,
      ...activityCopy(notification),
      createdAt: notification.created_at,
      route: activityRoute(notification.type),
      type: notification.type,
      avatar: notification.actorAvatar,
    }));
    const updateRows = updates
      .filter((update) => !notificationRows.some((row) => row.id === update.id))
      .map((update) => ({
        id: update.id,
        title: update.text,
        body: update.route === "/discover" ? "Someone new is in your Discover." : "Open to view the latest update.",
        createdAt: update.created_at,
        route: update.route,
        type: update.route === "/discover" ? "new_match" : "partner_logged",
        avatar: null,
      }));
    return [...notificationRows, ...updateRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, updates]);

  const weekDays = useMemo(() => {
    const start = startOfWeek();
    return ["M", "T", "W", "T", "F", "S", "S"].map((label, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = localDay(date);
      return {
        key,
        label,
        journal: daily.weeklyJournalDays.includes(key),
        checkin: partner?.weeklyCheckinDays.includes(key) || false,
        future: date.getTime() > Date.now(),
      };
    });
  }, [daily.weeklyJournalDays, partner?.weeklyCheckinDays]);

  if (guardLoading || loading) {
    return (
      <AppLayout>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative flex-1 overflow-hidden bg-background pb-24">
        <section className="relative overflow-hidden px-6 pb-7 pt-safe-6">
          <img
            src={globeImage}
            alt=""
            aria-hidden="true"
            width={770}
            height={744}
            className="pointer-events-none absolute -right-32 -top-28 h-[360px] w-[372px] max-w-none object-cover opacity-45"
          />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.42em] text-foreground/70">TradersWorld</p>
              <h1 className="font-serif text-[34px] font-normal leading-[1.03] text-foreground">
                Welcome back,
                <span className="block text-accent">@{profile?.username || "trader"}</span>
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} aria-label="Open my profile" className="mt-2 h-[50px] w-[50px] overflow-hidden rounded-full border-2 border-border bg-background/30 p-0 hover:bg-background/50">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="My profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-foreground">{(profile?.username || "T").slice(0, 1).toUpperCase()}</span>
              )}
            </Button>
          </div>

          <div className="relative z-10 mt-8 flex divide-x divide-border/70">
            <Stat icon={<Bookmark className="h-5 w-5" strokeWidth={1.6} />} value={stats.savedYou} label="Saved" onClick={() => navigate("/saved")} />
            <Stat icon={<Users className="h-5 w-5" strokeWidth={1.6} />} value={stats.waiting} label="Waiting" onClick={() => navigate("/waiting-list")} />
            <Stat icon={<span className="flex h-5 items-end gap-1"><i className="h-2 w-0.5 bg-current" /><i className="h-3.5 w-0.5 bg-current" /><i className="h-5 w-0.5 bg-current" /></span>} value={stats.streak} label="Day Streak" detail={`Max ${stats.maxStreak}`} />
            <Stat icon={<NotebookTabs className="h-5 w-5" strokeWidth={1.6} />} value={stats.logs} label="Journal" detail={`${stats.activeStreaks} Active`} onClick={() => navigate("/trading-log")} />
          </div>
        </section>

        <main className="relative z-10 px-4">
          <Button variant="ghost" onClick={() => navigate("/trading-log")} className="group relative h-[80px] w-full justify-start overflow-hidden rounded-xl border border-accent/35 bg-card/90 px-4 text-left hover:bg-card">
            <img src={globeImage} alt="" aria-hidden="true" width={770} height={744} className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 object-cover opacity-20" />
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-foreground">
              <NotebookTabs className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <span className="relative ml-4 min-w-0 flex-1">
              <span className="block font-serif text-[19px] leading-6 text-foreground">{daily.journalToday ? "Today’s entry complete" : "Add today’s entry"}</span>
              <span className="mt-1 block text-[11px] font-normal leading-4 text-muted-foreground">{daily.journalToday ? "Review or update today’s journal." : "Track your progress, mindset and more."}</span>
            </span>
            <span className="relative ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/25 text-foreground">
              <ChevronRight className="h-5 w-5" />
            </span>
          </Button>

          <section className="mt-6">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <h2 className="font-serif text-[22px] font-normal text-foreground">Recent Activity</h2>
              {activity.length > 3 && <Button variant="ghost" onClick={() => setShowAllActivity((value) => !value)} className="h-8 px-0 text-xs font-medium text-accent hover:bg-transparent hover:text-accent">
                {showAllActivity ? "Show less" : "View all"} <ChevronRight className={`h-4 w-4 transition-transform ${showAllActivity ? "rotate-90" : ""}`} />
              </Button>
              }
            </div>
            {activity.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border bg-card/70">
                {(showAllActivity ? activity : activity.slice(0, 3)).map((item, index) => (
                  <Button key={item.id} variant="ghost" onClick={() => navigate(item.route)} className={`h-[66px] w-full justify-start rounded-none px-3 text-left hover:bg-muted/30 ${index > 0 ? "border-t border-border" : ""}`}>
                    {item.avatar ? (
                      <img src={item.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <ActivityIcon type={item.type} />
                      </span>
                    )}
                    <span className="ml-3 min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-foreground">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-normal text-muted-foreground">{item.body}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-[10px] font-normal text-muted-foreground">{timeAgo(item.createdAt)}</span>
                    <ChevronRight className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
                  </Button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card/70 px-4 py-6 text-center">
                <p className="text-xs font-semibold text-foreground">You’re all caught up</p>
                <p className="mt-1 text-[10px] text-muted-foreground">New activity will appear here.</p>
              </div>
            )}
          </section>

          {daily.nearbyCount > 0 && (
            <section className="mt-6 border-y border-border/70 py-3">
              <Button variant="ghost" onClick={() => navigate("/map")} className="h-auto w-full justify-start rounded-none px-1 py-0 text-left hover:bg-transparent">
                <MapPin className="mr-3 h-5 w-5 shrink-0 text-accent" strokeWidth={1.7} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground">{daily.nearbyCount} trader{daily.nearbyCount === 1 ? "" : "s"} nearby</span>
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">Within 50 miles of you</span>
                </span>
                <span className="flex items-center text-[11px] font-semibold text-accent">Explore <ChevronRight className="h-4 w-4" /></span>
              </Button>
            </section>
          )}

          <section className="mt-6">
            <h2 className="mb-2 px-1 font-serif text-[22px] font-normal text-foreground">Your Partner</h2>
            {partner ? (
              <div className="flex items-center gap-3 border-y border-border/70 py-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(`/profile/${partner.id}`)} className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted p-0">
                  {partner.avatarUrl ? <img src={partner.avatarUrl} alt="" className="h-full w-full object-cover" /> : <Users className="h-5 w-5 text-muted-foreground" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{partner.username}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{partner.identity}</p>
                  <p className={`mt-1 text-[10px] ${partner.checkedInToday ? "text-accent" : "text-muted-foreground"}`}>
                    {partner.checkedInToday ? "Checked in today" : "Check-in not complete"}{partner.streak > 0 ? ` · ${partner.streak} day streak` : ""}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => navigate(`/messages?partner=${partner.id}`)} className="h-8 gap-1.5 px-2 text-[11px] text-accent hover:bg-accent/10 hover:text-accent">
                  <MessageSquare className="h-4 w-4" /> Message
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => navigate("/discover")} className="h-auto w-full justify-start rounded-none border-y border-border/70 px-1 py-3 text-left hover:bg-transparent">
                <Users className="mr-3 h-5 w-5 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground">Find your trading partner</span>
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">Explore traders in Discover</span>
                </span>
                <ChevronRight className="h-4 w-4 text-accent" />
              </Button>
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-2 px-1 font-serif text-[22px] font-normal text-foreground">Today</h2>
            <div className="divide-y divide-border/60 border-y border-border/70">
              <Button variant="ghost" onClick={() => navigate("/trading-log")} className="h-11 w-full justify-start rounded-none px-1 hover:bg-transparent">
                <span className="flex-1 text-left text-[12px] text-foreground">Journal entry</span>
                <span className={`flex items-center gap-1.5 text-[11px] ${daily.journalToday ? "text-accent" : "text-muted-foreground"}`}>
                  {daily.journalToday ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{daily.journalToday ? "Complete" : "Not complete"}
                </span>
              </Button>
              {partner && (
                <Button variant="ghost" onClick={() => navigate(`/messages?partner=${partner.id}`)} className="h-11 w-full justify-start rounded-none px-1 hover:bg-transparent">
                  <span className="flex-1 text-left text-[12px] text-foreground">Partner check-in</span>
                  <span className={`flex items-center gap-1.5 text-[11px] ${partner.checkedInToday ? "text-accent" : "text-muted-foreground"}`}>
                    {partner.checkedInToday ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{partner.checkedInToday ? "Complete" : "Not complete"}
                  </span>
                </Button>
              )}
            </div>
          </section>

          <section className="mt-6 pb-4">
            <h2 className="mb-2 px-1 font-serif text-[22px] font-normal text-foreground">This Week</h2>
            <div className="border-y border-border/70 py-3">
              <div className={`grid ${partner ? "grid-cols-3" : "grid-cols-2"} divide-x divide-border/60`}>
                <div className="px-2 first:pl-1"><p className="text-[18px] font-semibold text-foreground">{daily.weeklyJournalDays.length}</p><p className="text-[9px] text-muted-foreground">Journal days</p></div>
                {partner && <div className="px-3"><p className="text-[18px] font-semibold text-foreground">{partner.weeklyCheckinDays.length}</p><p className="text-[9px] text-muted-foreground">Partner check-ins</p></div>}
                <div className="px-3"><p className="text-[18px] font-semibold text-foreground">{stats.streak}</p><p className="text-[9px] text-muted-foreground">Current streak</p></div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day.key} className="text-center">
                    <span className="text-[9px] text-muted-foreground">{day.label}</span>
                    <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${day.journal || day.checkin ? "bg-accent" : day.future ? "bg-transparent" : "bg-muted"}`} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </AppLayout>
  );
};

export default Dashboard;