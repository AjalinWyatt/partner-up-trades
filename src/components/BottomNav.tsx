import { useLocation, useNavigate } from "react-router-dom";
import { Globe, Search, Users, BookOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/feed", icon: Globe, label: "Feed" },
  { path: "/discover", icon: Search, label: "Discover" },
  { path: "/log", icon: BookOpen, label: "Log", isFab: true },
  { path: "/partners", icon: Users, label: "Partners" },
  { path: "/messages", icon: MessageSquare, label: "Messages" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-background/95 backdrop-blur-xl border-t border-border flex items-center justify-around px-2 z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;

        if (tab.isFab) {
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative -mt-5 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
            >
              <Icon className="w-5 h-5 text-primary-foreground" strokeWidth={2} />
            </button>
          );
        }

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex flex-col items-center gap-0.5 transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2 : 1.6} />
            <span className="text-[9px] font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
