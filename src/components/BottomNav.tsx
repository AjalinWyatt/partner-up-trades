import { useLocation, useNavigate } from "react-router-dom";
import { Home, Globe, AlignLeft, MessageSquare, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/discover", icon: Globe, label: "Discover" },
  { path: "/feed", icon: AlignLeft, label: "Feed" },
  { path: "/messages", icon: MessageSquare, label: "Messages" },
  { path: "/trading-log", icon: BookOpen, label: "Log" },
  { path: "/partners", icon: User, label: "Partners" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl rounded-t-3xl flex items-center justify-around px-3 pt-3 pb-5 z-50">
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
                className="w-12 h-[52px] flex items-center justify-center bg-accent"
                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
              >
                <Icon className="w-6 h-6 text-accent-foreground" strokeWidth={2} />
              </div>
            ) : (
              <Icon className="w-7 h-7 text-foreground" strokeWidth={1.6} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
