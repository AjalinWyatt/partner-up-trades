import { useLocation, useNavigate } from "react-router-dom";
import { Home, Globe, Users, BookOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/discover", icon: Globe, label: "Discover" },
  { path: "/feed", icon: Globe, label: "Feed" },
  { path: "/messages", icon: MessageSquare, label: "Messages" },
  { path: "/trading-log", icon: BookOpen, label: "Log" },
  { path: "/partners", icon: Users, label: "Partners" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-xl border-t border-border flex items-center justify-around px-2 pb-2 z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex flex-col items-center gap-0.5 transition-colors",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={1.6} />
            <span className="text-[9px] font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
