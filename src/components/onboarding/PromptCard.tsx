import { cn } from "@/lib/utils";
import { useState } from "react";

interface PromptCardProps {
  icon: string;
  title: string;
  question: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}

const PromptCard = ({ icon, title, question, options, selected, onToggle }: PromptCardProps) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={cn(
      "rounded-2xl border-[1.5px] p-4 mb-2.5 transition-all",
      selected.length > 0 ? "border-success bg-success/5" : "border-border bg-secondary"
    )}>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 mb-2 w-full text-left">
        <span className="text-sm">{icon}</span>
        <span className="text-[13px] font-bold text-primary uppercase tracking-wider">{title}</span>
      </button>
      {expanded && (
        <>
          <div className="text-sm font-semibold text-foreground mb-2.5">{question}</div>
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onToggle(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all",
                  selected.includes(opt)
                    ? "bg-gradient-to-r from-primary to-success border-transparent text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-success"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PromptCard;
