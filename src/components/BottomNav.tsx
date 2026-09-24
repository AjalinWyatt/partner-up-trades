import { useLocation, useNavigate } from "react-router-dom";
import { Home, CircleCheck, MessagesSquare, BookOpen, UserRound } from "lucide-react";
import FeedNavIcon from "@/components/icons/FeedNavIcon";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useQueryClient } from "@tanstack/react-query";
import { warmRoute } from "@/lib/routePrefetch";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home", tour: "nav-home" },
  { path: "/discover", icon: CircleCheck, label: "Discover", tour: "nav-discover" },
  { path: "/feed", icon: FeedNavIcon, label: "Community", tour: "nav-feed" },
  { path: "/messages", icon: MessagesSquare, label: "Messages", tour: "nav-messages" },
  { path: "/trading-log", icon: BookOpen, label: "Journal", tour: "nav-log" },
  { path: "/profile", icon: UserRound, label: "Profile", tour: "nav-profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { homeDot, messagesDot, discoverDot, partnersDot } = useNavBadges();
  const queryClient = useQueryClient();

  const dotForPath: Record<string, boolean> = {
    "/dashboard": homeDot,
    "/messages": messagesDot,
    "/discover": discoverDot,
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
        // "New" label only on Discover and Partners (not Home / Messages).
        const showNewLabel = showDot && (tab.path === "/discover" || tab.path === "/partners");

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
                className="pointer-events-none absolute -top-0.5 right-0 h-1.5 w-1.5 rounded-full bg-[hsl(210_100%_60%)] animate-slow-blink"
              />
            )}
            {showNewLabel && (
              <span
                aria-hidden
                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(210_100%_60%)] px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wide text-white animate-slow-blink"
              >
                New
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
