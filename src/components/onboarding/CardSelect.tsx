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

/**
 * Vertical stepper-style selector matching the "Experience level" mockup -
 * connected dots on the left with labels on the right.
 */
const CardSelect = ({ options, selected, onSelect }: CardSelectProps) => (
  <div className="relative">
    {/* Vertical connector line */}
    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-muted via-muted-foreground/30 to-muted" />

    <div className="flex flex-col">
      {options.map((opt) => {
        const isOn = selected === opt.label;
        return (
          <button
            key={opt.label}
            onClick={() => onSelect(opt.label)}
            className="flex items-center gap-4 py-3 text-left group"
          >
            <span
              className={cn(
                "relative z-10 w-[22px] h-[22px] rounded-full border-2 shrink-0 transition-all flex items-center justify-center",
                isOn
                  ? "bg-accent border-accent"
                  : "bg-background border-foreground/80"
              )}
            />
            <span
              className={cn(
                "text-[18px] transition-colors",
                isOn ? "text-accent font-semibold" : "text-foreground font-medium"
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default CardSelect;
