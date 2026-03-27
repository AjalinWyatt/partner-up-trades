import { cn } from "@/lib/utils";
import { MapPin, Globe, Compass } from "lucide-react";

const reachOptions = [
  { key: "Local", icon: MapPin, desc: "Near you" },
  { key: "Global", icon: Globe, desc: "Worldwide" },
  { key: "Both", icon: Compass, desc: "Open to all" },
];

interface ReachSelectProps {
  selected: string | null;
  onSelect: (v: string) => void;
}

const ReachSelect = ({ selected, onSelect }: ReachSelectProps) => (
  <div className="grid grid-cols-3 gap-2">
    {reachOptions.map((opt) => {
      const Icon = opt.icon;
      return (
        <button
          key={opt.key}
          onClick={() => onSelect(opt.key)}
          className={cn(
            "p-4 rounded-xl border-[1.5px] transition-all text-center",
            selected === opt.key
              ? "border-success bg-success/5"
              : "border-border bg-secondary hover:border-success"
          )}
        >
          <Icon className={cn("w-5 h-5 mx-auto mb-1.5", selected === opt.key ? "text-success" : "text-muted-foreground")} />
          <div className="text-xs font-bold text-foreground">{opt.key}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
        </button>
      );
    })}
  </div>
);

export default ReachSelect;
