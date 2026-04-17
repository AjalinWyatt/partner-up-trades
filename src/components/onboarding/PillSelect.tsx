import { cn } from "@/lib/utils";

interface PillSelectProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  multiSelect?: boolean;
}

const PillSelect = ({ options, selected, onToggle }: PillSelectProps) => (
  <div className="flex flex-wrap gap-2.5">
    {options.map((opt) => {
      const isOn = selected.includes(opt);
      return (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          className={cn(
            "px-5 py-2.5 rounded-full border text-[14px] font-medium transition-all",
            isOn
              ? "bg-accent border-accent text-accent-foreground"
              : "border-border bg-transparent text-foreground hover:border-accent/60"
          )}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

export default PillSelect;
