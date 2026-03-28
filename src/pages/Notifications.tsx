import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, UserPlus, UserCheck, Bell, CheckCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";

type FilterType = "all" | "like" | "comment" | "partner_request" | "partner_accepted";

interface Notification {
  id: string;
  actor_id: string;
  type: string;
  entry_id: string | null;
  read: boolean;
  created_at: string;
  actorName: string;
  actorUsername: string;
  actorAvatar: string | null;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "like", label: "Likes" },
  { key: "comment", label: "Comments" },
  { key: "partner_request", label: "Requests" },
  { key: "partner_accepted", label: "Accepted" },
];

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

    if (filter !== "all") {
      query = query.eq("type", filter);
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
        actorName: prof?.full_name || "Trader",
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

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.type === "like" || n.type === "comment") {
      navigate("/feed");
    } else if (n.type === "partner_request" || n.type === "partner_accepted") {
      navigate("/partners");
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="w-3.5 h-3.5 text-destructive" />;
      case "comment": return <MessageCircle className="w-3.5 h-3.5 text-primary" />;
      case "partner_request": return <UserPlus className="w-3.5 h-3.5 text-accent-foreground" />;
      case "partner_accepted": return <UserCheck className="w-3.5 h-3.5 text-success" />;
      default: return <Bell className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const typeText = (type: string) => {
    switch (type) {
      case "like": return "liked your post";
      case "comment": return "commented on your post";
      case "partner_request": return "sent you a partner request";
      case "partner_accepted": return "accepted your partner request";
      default: return "interacted with you";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-14">
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
            <p className="text-sm font-semibold text-foreground mb-1">No notifications</p>
            <p className="text-xs text-muted-foreground max-w-[260px]">
              {filter === "all"
                ? "When someone likes, comments, or connects with you, it'll show up here."
                : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} notifications yet.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {n.actorAvatar ? (
                    <img src={n.actorAvatar} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-black text-primary-foreground">
                      {getInitials(n.actorName)}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card flex items-center justify-center">
                    {typeIcon(n.type)}
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-snug">
                    <span className="font-bold">{n.actorName}</span>{" "}
                    <span className="text-muted-foreground">{typeText(n.type)}</span>
                  </p>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    @{n.actorUsername} · {timeAgo(n.created_at)}
                  </span>
                </div>

                {/* Unread dot */}
                {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
