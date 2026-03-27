import { cn } from "@/lib/utils";

interface PillSelectProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  multiSelect?: boolean;
}

const PillSelect = ({ options, selected, onToggle }: PillSelectProps) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onToggle(opt)}
        className={cn(
          "px-4 py-2.5 rounded-full border-[1.5px] text-[13px] font-semibold transition-all",
          selected.includes(opt)
            ? "bg-gradient-to-r from-primary to-success border-transparent text-primary-foreground"
            : "border-border bg-secondary text-muted-foreground hover:border-success"
        )}
      >
        {opt}
      </button>
    ))}
  </div>
);

export default PillSelect;
