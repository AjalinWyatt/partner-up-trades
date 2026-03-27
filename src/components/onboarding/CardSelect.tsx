import { cn } from "@/lib/utils";

interface CardOption {
  icon: string;
  label: string;
  description?: string;
}

interface CardSelectProps {
  options: CardOption[];
  selected: string | null;
  onSelect: (label: string) => void;
}

const CardSelect = ({ options, selected, onSelect }: CardSelectProps) => (
  <div className="flex flex-col gap-2">
    {options.map((opt) => (
      <button
        key={opt.label}
        onClick={() => onSelect(opt.label)}
        className={cn(
          "flex items-center gap-3 p-3.5 rounded-xl border-[1.5px] transition-all text-left",
          selected === opt.label
            ? "border-success bg-success/10"
            : "border-border bg-secondary hover:border-success"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-[10px] flex items-center justify-center text-lg shrink-0",
          selected === opt.label ? "bg-success/15" : "bg-muted"
        )}>
          {opt.icon}
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">{opt.label}</div>
          {opt.description && <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>}
        </div>
      </button>
    ))}
  </div>
);

export default CardSelect;
