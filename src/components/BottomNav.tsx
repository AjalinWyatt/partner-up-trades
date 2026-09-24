import { useLocation, useNavigate } from "react-router-dom";
import { Home, CircleCheck, MessagesSquare, BookOpen, Users, Sparkles } from "lucide-react";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useQueryClient } from "@tanstack/react-query";
import { warmRoute } from "@/lib/routePrefetch";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home", tour: "nav-home" },
  { path: "/discover", icon: CircleCheck, label: "Discover", tour: "nav-discover" },
  { path: "/feed", icon: Sparkles, label: "Pulse", tour: "nav-feed" },
  { path: "/messages", icon: MessagesSquare, label: "Messages", tour: "nav-messages" },
  { path: "/trading-log", icon: BookOpen, label: "Journal", tour: "nav-log" },
  { path: "/partners", icon: Users, label: "Partners", tour: "nav-partners" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { homeDot, messagesDot, partnersDot } = useNavBadges();
  const queryClient = useQueryClient();

  const dotForPath: Record<string, boolean> = {
    "/dashboard": homeDot,
    "/messages": messagesDot,
    "/partners": partnersDot,
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/70 bg-background/95 px-3 pt-2.5 backdrop-blur-xl"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;
        const showDot = !!dotForPath[tab.path];
        return (
          <button
            key={tab.path}
            data-tour={tab.tour}
            onClick={() => navigate(tab.path)}
            onTouchStart={() => warmRoute(tab.path, queryClient)}
            onMouseEnter={() => warmRoute(tab.path, queryClient)}
            className="relative flex items-center justify-center"
            aria-label={tab.label}
          >
            <div className="flex min-w-[45px] flex-col items-center gap-1">
              <Icon className={active ? "h-[21px] w-[21px] text-accent" : "h-[21px] w-[21px] text-muted-foreground"} strokeWidth={active ? 2.4 : 1.8} />
              <span className={active ? "text-[9px] font-semibold text-accent" : "text-[9px] text-muted-foreground"}>{tab.label}</span>
            </div>
            {showDot && (
              <span
                aria-hidden
                className="pointer-events-none absolute -top-0.5 right-0 h-1.5 w-1.5 rounded-full bg-accent animate-slow-blink"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
