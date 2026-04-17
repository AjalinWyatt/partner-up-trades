import { cn } from "@/lib/utils";

const reachOptions = [
  { key: "Local", pos: 0 },
  { key: "Global", pos: 50 },
  { key: "Both", pos: 100 },
];

interface ReachSelectProps {
  selected: string | null;
  onSelect: (v: string) => void;
}

/**
 * Slider-style selector matching the mockup.
 * A horizontal track with three handles; selected handle is filled cyan, others white.
 */
const ReachSelect = ({ selected, onSelect }: ReachSelectProps) => {
  return (
    <div className="px-2 pt-2 pb-1">
      <div className="relative h-3 mx-3">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-muted via-foreground/40 to-muted-foreground rounded-full" />

        {/* Handles */}
        {reachOptions.map((opt) => {
          const isOn = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              aria-label={opt.key}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 transition-all",
                isOn
                  ? "bg-accent border-accent scale-110"
                  : "bg-background border-foreground"
              )}
              style={{ left: `${opt.pos}%` }}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-3 px-0">
        {reachOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className={cn(
              "text-[15px] font-medium transition-colors",
              selected === opt.key ? "text-accent" : "text-foreground"
            )}
          >
            {opt.key}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReachSelect;
