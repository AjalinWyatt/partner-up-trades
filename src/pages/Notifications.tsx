import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, UserPlus, UserCheck, Bell, CheckCheck, Eye, Target, Flame, AlertTriangle, BookOpen } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";

type FilterType = "all" | "activity" | "partners" | "streaks";

interface Notification {
  id: string;
  actor_id: string;
  type: string;
  title: string | null;
  body: string | null;
  entry_id: string | null;
  read: boolean;
  created_at: string;
  actorName: string;
  actorUsername: string;
  actorAvatar: string | null;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "activity", label: "Activity" },
  { key: "partners", label: "Partners" },
  { key: "streaks", label: "Streaks" },
];

const FILTER_TYPES: Record<FilterType, string[]> = {
  all: [],
  activity: ["post_liked", "post_commented", "profile_viewed", "new_match", "like", "comment"],
  partners: ["partner_request", "partner_accepted", "partner_inactive", "partner_support", "partner_logged"],
  streaks: ["streak_warning", "streak_milestone"],
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; route: string }> = {
  partner_request:  { icon: <UserPlus className="w-4 h-4" />,       color: "text-primary bg-primary/15",         route: "/partners" },
  partner_accepted: { icon: <UserCheck className="w-4 h-4" />,      color: "text-success bg-success/15",         route: "/messages" },
  partner_inactive: { icon: <AlertTriangle className="w-4 h-4" />,  color: "text-orange-400 bg-orange-400/15",   route: "/messages" },
  partner_support:  { icon: <Heart className="w-4 h-4" />,          color: "text-destructive bg-destructive/15", route: "/messages" },
  post_liked:       { icon: <Heart className="w-4 h-4" />,          color: "text-destructive bg-destructive/15", route: "/feed" },
  post_commented:   { icon: <MessageCircle className="w-4 h-4" />,  color: "text-primary bg-primary/15",         route: "/feed" },
  profile_viewed:   { icon: <Eye className="w-4 h-4" />,            color: "text-accent-foreground bg-accent/15", route: "/partners" },
  new_match:        { icon: <Target className="w-4 h-4" />,         color: "text-success bg-success/15",         route: "/discover" },
  streak_warning:   { icon: <Flame className="w-4 h-4" />,          color: "text-orange-400 bg-orange-400/15",   route: "/log" },
  streak_milestone: { icon: <Flame className="w-4 h-4" />,          color: "text-success bg-success/15",         route: "/log" },
  partner_logged:   { icon: <BookOpen className="w-4 h-4" />,       color: "text-primary bg-primary/15",         route: "/log" },
  like:             { icon: <Heart className="w-4 h-4" />,          color: "text-destructive bg-destructive/15", route: "/feed" },
  comment:          { icon: <MessageCircle className="w-4 h-4" />,  color: "text-primary bg-primary/15",         route: "/feed" },
};

const fallbackTypeText = (type: string) => {
  switch (type) {
    case "like": case "post_liked": return "liked your post";
    case "comment": case "post_commented": return "commented on your post";
    case "partner_request": return "sent you a partner request";
    case "partner_accepted": return "accepted your partner request";
    default: return "interacted with you";
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const loadNotifications = async (uid: string) => {
    setLoading(true);
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(100);

    const typeFilter = FILTER_TYPES[filter];
    if (typeFilter.length > 0) {
      query = query.in("type", typeFilter);
    }

    const { data: notifs } = await query;

    if (!notifs || notifs.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const actorIds = [...new Set(notifs.map(n => n.actor_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", actorIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    setNotifications(notifs.map(n => {
      const prof = profileMap.get(n.actor_id);
      return {
        ...n,
        actorName: prof?.username ? `@${prof.username}` : "trader",
        actorUsername: prof?.username || "trader",
        actorAvatar: prof?.avatar_url || null,
      };
    }));
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      loadNotifications(user.id);
    };
    init();
  }, []);

  useEffect(() => {
    if (userId) loadNotifications(userId);
  }, [filter]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notifs-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        loadNotifications(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, filter]);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.like;
    navigate(config.route);
  };

  const getDisplayTitle = (n: Notification) => {
    if (n.title) return n.title;
    return `${n.actorName} ${fallbackTypeText(n.type)}`;
  };

  const getDisplayBody = (n: Notification) => {
    if (n.body) return n.body;
    return fallbackTypeText(n.type);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="text-base font-bold text-foreground">Notifications</span>
        {unreadCount > 0 ? (
          <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-primary font-semibold">
            <CheckCheck className="w-3.5 h-3.5" /> Read all
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">You're all caught up ✓</p>
            <p className="text-xs text-muted-foreground max-w-[260px]">
              {filter === "all"
                ? "When someone interacts with you, it'll show up here."
                : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} notifications yet.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.like;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-snug">
                      {getDisplayTitle(n)}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                      {getDisplayBody(n)}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>

                  {/* Unread dot */}
                  {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      
    </AppLayout>
  );
};

export default Notifications;
