import { useLocation, useNavigate } from "react-router-dom";
import { Home, Earth, MessagesSquare, BookOpen, Users } from "lucide-react";
import FeedNavIcon from "@/components/icons/FeedNavIcon";

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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around rounded-t-[28px] bg-card/95 px-3 pt-2.5 backdrop-blur-xl"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;

        return (
          <button
            key={tab.path}
            data-tour={tab.tour}
            onClick={() => navigate(tab.path)}
            className="flex items-center justify-center"
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
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
