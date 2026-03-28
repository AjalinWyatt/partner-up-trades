import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, timeAgo } from "@/lib/matchUtils";

interface Notification {
  id: string;
  actor_id: string;
  type: string;
  entry_id: string | null;
  read: boolean;
  created_at: string;
  actorName: string;
  actorAvatar: string | null;
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load user & unread count
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

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("my-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          setUnreadCount(prev => prev + 1);
          // If panel is open, reload
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
      .limit(30);

    if (!notifs || notifs.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const actorIds = [...new Set(notifs.map(n => n.actor_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", actorIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    setNotifications(notifs.map(n => {
      const prof = profileMap.get(n.actor_id);
      return {
        ...n,
        actorName: prof?.full_name || "Trader",
        actorAvatar: prof?.avatar_url || null,
      };
    }));
    setLoading(false);
  };

  const handleOpen = () => {
    if (!open) {
      setOpen(true);
      loadNotifications();
    } else {
      setOpen(false);
    }
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

  const handleNotifClick = (n: Notification) => {
    if (n.entry_id) {
      navigate("/feed");
    } else if (n.type === "partner_request" || n.type === "partner_accepted") {
      navigate("/partners");
    }
    setOpen(false);
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

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen} className="w-8 h-8 flex items-center justify-center relative">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 max-h-[400px] bg-card border border-border rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-xs font-bold text-foreground">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-primary font-semibold">
                  Mark all read
                </button>
              )}
              <button
                onClick={() => { navigate("/notifications"); setOpen(false); }}
                className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
              >
                View all
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  {n.actorAvatar ? (
                    <img src={n.actorAvatar} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-black text-primary-foreground shrink-0">
                      {getInitials(n.actorName)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground leading-snug">
                      <span className="font-bold">{n.actorName}</span>{" "}
                      <span className="text-muted-foreground">{typeText(n.type)}</span>
                    </p>
                    <span className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
