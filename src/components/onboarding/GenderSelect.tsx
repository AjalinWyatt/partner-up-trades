import { cn } from "@/lib/utils";
import { Mars, Venus, Link2 } from "lucide-react";

const iconFor = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("female")) return Venus;
  if (l.includes("male")) return Mars;
  return Link2;
};

interface GenderSelectProps {
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
}

const GenderSelect = ({ options, selected, onSelect }: GenderSelectProps) => (
  <div className="flex flex-wrap gap-2.5">
    {options.map((opt) => {
      const Icon = iconFor(opt);
      const isOn = selected === opt;
      return (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full border text-[14px] font-medium transition-all",
            isOn
              ? "bg-accent border-accent text-accent-foreground"
              : "border-border bg-transparent text-foreground hover:border-accent/60"
          )}
        >
          <Icon className="w-4 h-4" />
          {opt}
        </button>
      );
    })}
  </div>
);

export default GenderSelect;
