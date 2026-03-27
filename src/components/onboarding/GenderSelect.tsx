import { cn } from "@/lib/utils";

interface GenderSelectProps {
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
}

const GenderSelect = ({ options, selected, onSelect }: GenderSelectProps) => (
  <div className="flex gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onSelect(opt)}
        className={cn(
          "flex-1 py-3 px-2 rounded-xl border-[1.5px] text-[13px] font-semibold transition-all text-center",
          selected === opt
            ? "bg-gradient-to-r from-primary to-success border-transparent text-primary-foreground"
            : "border-border bg-secondary text-muted-foreground hover:border-success"
        )}
      >
        {opt}
      </button>
    ))}
  </div>
);

export default GenderSelect;
