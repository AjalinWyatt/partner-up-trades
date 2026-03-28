import { useState, useEffect } from "react";
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Eye, Target, Flame, AlertTriangle, BookOpen, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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
  actorAvatar: string | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; route: string }> = {
  partner_request:  { icon: <UserPlus className="w-4 h-4" />,       color: "text-primary bg-primary/15",        route: "/partners" },
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
  // Legacy fallbacks
  like:             { icon: <Heart className="w-4 h-4" />,          color: "text-destructive bg-destructive/15", route: "/feed" },
  comment:          { icon: <MessageCircle className="w-4 h-4" />,  color: "text-primary bg-primary/15",         route: "/feed" },
};

const fallbackTypeText = (type: string) => {
  switch (type) {
    case "like": return "liked your post";
    case "comment": return "commented on your post";
    case "partner_request": return "sent you a partner request";
    case "partner_accepted": return "accepted your partner request";
    default: return "interacted with you";
  }
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };
    init();
  }, []);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("my-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          setUnreadCount(prev => prev + 1);
          if (open) loadNotifications();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, open]);

  const loadNotifications = async () => {
    if (!userId) return;
    setLoading(true);

    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!notifs || notifs.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const actorIds = [...new Set(notifs.map(n => n.actor_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", actorIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    setNotifications(notifs.map(n => {
      const prof = profileMap.get(n.actor_id);
      return {
        ...n,
        actorName: prof?.username ? `@${prof.username}` : "trader",
        actorAvatar: prof?.avatar_url || null,
      };
    }));
    setLoading(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) loadNotifications();
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotifClick = async (n: Notification) => {
    // Mark as read
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    const config = TYPE_CONFIG[n.type];
    const route = config?.route || "/feed";
    setOpen(false);
    navigate(route);
  };

  const getDisplayTitle = (n: Notification) => {
    if (n.title) return n.title;
    return `${n.actorName} ${fallbackTypeText(n.type)}`;
  };

  const getDisplayBody = (n: Notification) => {
    if (n.body) return n.body;
    return fallbackTypeText(n.type);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          <button className="w-8 h-8 flex items-center justify-center relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[80vh] bg-card border-border">
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-sm font-bold text-foreground">Notifications</DrawerTitle>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); navigate("/notifications"); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                >
                  View all
                </button>
              </div>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto max-h-[60vh] pb-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">You're all caught up ✓</p>
                <p className="text-xs text-muted-foreground">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(n => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.like;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${
                        !n.read ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground leading-snug truncate">
                          {getDisplayTitle(n)}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                          {getDisplayBody(n)}
                        </p>
                        <span className="text-[9px] text-muted-foreground mt-1 block">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>

                      {/* Unread dot */}
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default NotificationBell;
