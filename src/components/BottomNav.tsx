import { useLocation, useNavigate } from "react-router-dom";
import { Home, Earth, MessagesSquare, BookOpen, Users } from "lucide-react";

const FeedIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
    <line x1="6" y1="8" x2="20" y2="8" />
    <line x1="9" y1="13" x2="20" y2="13" />
    <line x1="12" y1="18" x2="20" y2="18" />
  </svg>
);

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/discover", icon: Earth, label: "Discover" },
  { path: "/feed", icon: FeedIcon, label: "Feed" },
  { path: "/messages", icon: MessagesSquare, label: "Messages" },
  { path: "/trading-log", icon: BookOpen, label: "Log" },
  { path: "/partners", icon: Users, label: "Partners" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around rounded-t-[30px] border-t border-border/60 bg-card/95 px-4 pt-4 pb-6 backdrop-blur-xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex items-center justify-center"
            aria-label={tab.label}
          >
            {active ? (
              <div
                className="flex h-[58px] w-[58px] items-center justify-center bg-accent"
                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
              >
                <Icon className="h-7 w-7 text-accent-foreground" strokeWidth={2.1} />
              </div>
            ) : (
              <Icon className="h-8 w-8 text-foreground" strokeWidth={1.9} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
