import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";

const MaleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="5" />
    <path d="M14.5 9.5 L20 4" />
    <path d="M15 4 H20 V9" />
  </svg>
);

const FemaleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="5" />
    <path d="M12 14 V21" />
    <path d="M9 18 H15" />
  </svg>
);

const iconFor = (label: string): (() => JSX.Element) => {
  const l = label.toLowerCase();
  if (l.includes("female")) return FemaleIcon;
  if (l.includes("male")) return MaleIcon;
  return () => <Link2 className="w-4 h-4" />;
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
          <Icon />
          {opt}
        </button>
      );
    })}
  </div>
);

export default GenderSelect;
