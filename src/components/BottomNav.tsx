import { useLocation, useNavigate } from "react-router-dom";
import { Home, Earth, MessagesSquare, BookOpen, Users } from "lucide-react";
import FeedNavIcon from "@/components/icons/FeedNavIcon";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useQueryClient } from "@tanstack/react-query";
import { warmRoute } from "@/lib/routePrefetch";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home", tour: "nav-home" },
  { path: "/discover", icon: Earth, label: "Discover", tour: "nav-discover" },
  { path: "/feed", icon: FeedNavIcon, label: "Feed", tour: "nav-feed" },
  { path: "/messages", icon: MessagesSquare, label: "Messages", tour: "nav-messages" },
  { path: "/trading-log", icon: BookOpen, label: "Log", tour: "nav-log" },
  { path: "/partners", icon: Users, label: "Partners", tour: "nav-partners" },
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
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around rounded-t-[28px] bg-card/95 px-3 pt-2.5 backdrop-blur-xl"
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
            {active ? (
              <div
                className="flex h-[44px] w-[40px] items-center justify-center bg-accent"
                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
              >
                <Icon className="h-[20px] w-[20px] text-accent-foreground" strokeWidth={2} />
              </div>
            ) : (
              <Icon className="h-[22px] w-[22px] text-foreground" strokeWidth={1.8} />
            )}
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
