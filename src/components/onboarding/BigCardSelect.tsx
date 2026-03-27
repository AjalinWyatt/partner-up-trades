import { cn } from "@/lib/utils";

interface BigCardOption {
  icon: string;
  title: string;
  description: string;
}

interface BigCardSelectProps {
  options: BigCardOption[];
  selected: string[];
  onToggle: (title: string) => void;
}

const BigCardSelect = ({ options, selected, onToggle }: BigCardSelectProps) => (
  <div className="flex flex-col gap-2.5">
    {options.map((opt) => (
      <button
        key={opt.title}
        onClick={() => onToggle(opt.title)}
        className={cn(
          "p-5 rounded-2xl border-[1.5px] transition-all text-center",
          selected.includes(opt.title)
            ? "border-success bg-success/5"
            : "border-border bg-secondary hover:border-success"
        )}
      >
        <div className="text-[28px] mb-1.5">{opt.icon}</div>
        <div className="text-base font-extrabold text-foreground">{opt.title}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.description}</div>
      </button>
    ))}
  </div>
);

export default BigCardSelect;
