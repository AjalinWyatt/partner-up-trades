import { useLocation, useNavigate } from "react-router-dom";
import { Home, Globe, Earth, MessagesSquare, BookOpen, Users, UserRound, LogOut, Shield, Megaphone, UsersRound, Mail } from "lucide-react";
import FeedNavIcon from "@/components/icons/FeedNavIcon";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import Wordmark from "@/components/Wordmark";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useQueryClient } from "@tanstack/react-query";
import { warmRoute } from "@/lib/routePrefetch";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Home", tour: "nav-home" },
  { path: "/discover", icon: Earth, label: "Discover", tour: "nav-discover" },
  { path: "/feed", icon: FeedNavIcon, label: "Feed", tour: "nav-feed" },
  { path: "/messages", icon: MessagesSquare, label: "Messages", tour: "nav-messages" },
  { path: "/trading-log", icon: BookOpen, label: "Log", tour: "nav-log" },
  { path: "/partners", icon: Users, label: "Partners", tour: "nav-partners" },
  { path: "/profile", icon: UserRound, label: "Profile", tour: "nav-profile" },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const isAdmin = useIsAdmin();
  const [adminOpen, setAdminOpen] = useState(false);
  const { homeDot, messagesDot, discoverDot } = useNavBadges();
  const queryClient = useQueryClient();
  const dotForPath: Record<string, boolean> = {
    "/dashboard": homeDot,
    "/messages": messagesDot,
    "/discover": discoverDot,
  };

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) setAdminOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const [{ count: nCount }, { count: mCount }] = await Promise.all([
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("read", false),
      ]);
      setUnreadNotifs(nCount ?? 0);
      setUnreadMsgs(mCount ?? 0);
    };
    load();
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <aside className="hidden lg:flex flex-col w-[220px] xl:w-[245px] h-screen sticky top-0 border-r border-border bg-background px-3 py-6">
      <button onClick={() => navigate("/feed")} className="flex items-center gap-2 px-3 mb-8">
        <Wordmark size="text-lg" />
      </button>

      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const badge = item.path === "/dashboard" ? unreadNotifs : item.path === "/messages" ? unreadMsgs : 0;
          const showNewLabel = !!dotForPath[item.path] && (item.path === "/discover" || item.path === "/partners");

          return (
            <button
              key={item.path}
              data-tour={item.tour}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => warmRoute(item.path, queryClient)}
              onFocus={() => warmRoute(item.path, queryClient)}
              onTouchStart={() => warmRoute(item.path, queryClient)}
              className={cn(
                "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] transition-all group",
                active
                  ? "font-bold text-foreground bg-secondary"
                  : "font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <span className="relative inline-flex">
                <item.icon className={cn("w-[22px] h-[22px]", active && "text-foreground")} strokeWidth={active ? 2.2 : 1.6} />
                {dotForPath[item.path] && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[hsl(210_100%_60%)] animate-slow-blink"
                  />
                )}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {showNewLabel && (
                <span className="rounded-full bg-[hsl(210_100%_60%)] px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-white animate-slow-blink">
                  New
                </span>
              )}
              {badge > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-0.5 pt-4 border-t border-border mt-4">
        {isAdmin && (
          <div className="mb-1">
            <button
              onClick={() => setAdminOpen((o) => !o)}
              className={cn(
                "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] transition-all",
                location.pathname.startsWith("/admin")
                  ? "font-bold text-foreground bg-secondary"
                  : "font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Shield className="w-[22px] h-[22px]" strokeWidth={1.8} />
              <span className="flex-1 text-left">Admin</span>
            </button>
            {adminOpen && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                <button
                  onClick={() => navigate("/admin/users")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all",
                    location.pathname === "/admin/users"
                      ? "font-semibold text-foreground bg-secondary"
                      : "font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <UsersRound className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  <span>Users</span>
                </button>
                <button
                  onClick={() => navigate("/admin/broadcast")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all",
                    location.pathname === "/admin/broadcast"
                      ? "font-semibold text-foreground bg-secondary"
                      : "font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Megaphone className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  <span>Broadcast</span>
                </button>
                <button
                  onClick={() => navigate("/admin/beta-invites")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all",
                    location.pathname === "/admin/beta-invites"
                      ? "font-semibold text-foreground bg-secondary"
                      : "font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Mail className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  <span>Beta Invites</span>
                </button>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-[22px] h-[22px]" strokeWidth={1.6} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
