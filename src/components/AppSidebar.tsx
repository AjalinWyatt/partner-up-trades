import { useLocation, useNavigate } from "react-router-dom";
import { Home, Globe, Earth, MessagesSquare, BookOpen, Users, UserRound, Bell, Sun, Moon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const FeedIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
    <line x1="6" y1="8" x2="20" y2="8" />
    <line x1="9" y1="13" x2="20" y2="13" />
    <line x1="12" y1="18" x2="20" y2="18" />
  </svg>
);

const navItems = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/discover", icon: Earth, label: "Discover" },
  { path: "/feed", icon: FeedIcon, label: "Feed" },
  { path: "/messages", icon: MessagesSquare, label: "Messages" },
  { path: "/trading-log", icon: BookOpen, label: "Log" },
  { path: "/partners", icon: Users, label: "Partners" },
  { path: "/notifications", icon: Bell, label: "Notifications" },
  { path: "/profile", icon: UserRound, label: "Profile" },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

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
        <Globe className="w-6 h-6 text-[hsl(var(--success))]" />
        <span className="text-xl font-bold tracking-tight text-foreground">
          traders<span className="text-[hsl(var(--success))]">world</span>
          <span className="text-[8px] text-muted-foreground align-super ml-0.5">™</span>
        </span>
      </button>

      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const badge = item.path === "/notifications" ? unreadNotifs : item.path === "/messages" ? unreadMsgs : 0;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] transition-all group",
                active
                  ? "font-bold text-foreground bg-secondary"
                  : "font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <item.icon className={cn("w-[22px] h-[22px]", active && "text-foreground")} strokeWidth={active ? 2.2 : 1.6} />
              <span className="flex-1 text-left">{item.label}</span>
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
        <button
          onClick={() => {
            const next = !isDark;
            setIsDark(next);
            document.documentElement.classList.toggle("dark", next);
            localStorage.setItem("theme", next ? "dark" : "light");
          }}
          className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
        >
          {isDark ? <Sun className="w-[22px] h-[22px]" strokeWidth={1.6} /> : <Moon className="w-[22px] h-[22px]" strokeWidth={1.6} />}
          <span>{isDark ? "Light mode" : "Dark mode"}</span>
        </button>
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
