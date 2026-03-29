import { useLocation, useNavigate } from "react-router-dom";
import { Globe, Search, Users, BookOpen, MessageSquare, User, Bell, Sun, Moon, LogOut, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const navItems = [
  { path: "/feed", icon: Globe, label: "Feed" },
  { path: "/forums", icon: MessagesSquare, label: "Forums" },
  { path: "/discover", icon: Search, label: "Discover" },
  { path: "/partners", icon: Users, label: "Partners" },
  { path: "/log", icon: BookOpen, label: "Log" },
  { path: "/messages", icon: MessageSquare, label: "Messages" },
  { path: "/notifications", icon: Bell, label: "Notifications" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  useEffect(() => {
    const loadCounts = async () => {
      const { data } = await supabase.from("trading_profiles").select("markets");
      const counts: Record<string, number> = { All: 0, Forex: 0, Futures: 0, Options: 0 };
      (data || []).forEach((tp: any) => {
        if (tp.markets?.length > 0) {
          counts.All++;
          tp.markets.forEach((m: string) => { if (counts[m] !== undefined) counts[m]++; });
        }
      });
      setMarketCounts(counts);
    };
    loadCounts();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (feedDropRef.current && !feedDropRef.current.contains(e.target as Node)) setShowFeedDrop(false);
      if (forumsDropRef.current && !forumsDropRef.current.contains(e.target as Node)) setShowForumsDrop(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleMarketSelect = (m: string) => {
    setShowFeedDrop(false);
    if (location.pathname === "/feed") {
      setSearchParams(m === "All" ? {} : { market: m });
    } else {
      navigate(m === "All" ? "/feed" : `/feed?market=${m}`);
    }
  };

  const handleForumSelect = (f: string) => {
    setShowForumsDrop(false);
    navigate(`/forums?forum=${f}`);
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
          const isFeed = item.type === "feed";
          const isForums = item.type === "forums";

          return (
            <div key={item.path} className="relative" ref={isFeed ? feedDropRef : isForums ? forumsDropRef : undefined}>
              <button
                onClick={() => {
                  if (isFeed) {
                    if (location.pathname === "/feed") {
                      setShowFeedDrop(!showFeedDrop);
                      setShowForumsDrop(false);
                    } else {
                      navigate("/feed");
                    }
                  } else if (isForums) {
                    if (location.pathname === "/forums") {
                      setShowForumsDrop(!showForumsDrop);
                      setShowFeedDrop(false);
                    } else {
                      navigate("/forums");
                    }
                  } else {
                    navigate(item.path);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] transition-all group",
                  active
                    ? "font-bold text-foreground bg-secondary"
                    : "font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className={cn("w-[22px] h-[22px]", active && "text-foreground")} strokeWidth={active ? 2.2 : 1.6} />
                <span className="flex-1 text-left">{item.label}</span>
                {(isFeed || isForums) && (
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform",
                    (isFeed && showFeedDrop) || (isForums && showForumsDrop) ? "rotate-180" : ""
                  )} />
                )}
                {badge > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>

              {/* Feed market dropdown */}
              {isFeed && showFeedDrop && (
                <div className="ml-9 mt-0.5 mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {MARKET_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => handleMarketSelect(m)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-xs transition-colors",
                        location.pathname === "/feed" && activeMarket === m ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span>{m}</span>
                      <span className="text-[10px] text-muted-foreground">{marketCounts[m] || 0} active</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Forums dropdown */}
              {isForums && showForumsDrop && (
                <div className="ml-9 mt-0.5 mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {FORUM_OPTIONS.map(f => (
                    <button
                      key={f}
                      onClick={() => handleForumSelect(f)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-xs transition-colors",
                        location.pathname === "/forums" && activeForum === f ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <MessagesSquare className="w-3 h-3" />
                        <span>{f}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{marketCounts[f] || 0} traders</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
