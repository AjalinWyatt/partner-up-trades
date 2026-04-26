import {
  Clock,
  CandlestickChart,
  Brain,
  LayoutGrid,
  BookOpen,
  EyeOff,
  Timer,
  BarChart3,
  Repeat,
  DollarSign,
  BarChart2,
  Moon,
  Target,
  Activity,
  ClipboardList,
  ArrowDownCircle,
  Crosshair,
  UserRound,
  Users,
  NotebookPen,
  Globe2,
  type LucideIcon,
} from "lucide-react";

export interface DetailCardItem {
  label: string;
  value: string;
}

const ICONS: Record<string, LucideIcon> = {
  Session: Clock,
  "Trading Style": CandlestickChart,
  Strategy: Brain,
  Strategies: Brain,
  Charts: LayoutGrid,
  "Chart Prompts": LayoutGrid,
  Interests: BookOpen,
  "Off Chart": EyeOff,
  Timeframe: Timer,
  Timeframes: Timer,
  "Experience level": BarChart3,
  Experience: BarChart3,
  "How Often": Repeat,
  Markets: DollarSign,
  Instruments: BarChart2,
  "Trade Times": Moon,
  "Primary Goal": Target,
  "Primary Goals": Target,
  Struggles: Activity,
  "Trading Plan": ClipboardList,
  "Loss Response": ArrowDownCircle,
  "Match Priority": Crosshair,
  "Looking For": UserRound,
  Gender: Users,
  Journaling: NotebookPen,
  "Connection Reach": Globe2,
};

export const DetailCardsGrid = ({ items }: { items: DetailCardItem[] }) => {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2.5 px-4 pt-4 pb-8">
      {items.map((it, i) => {
        const Icon = ICONS[it.label] || BarChart3;
        return (
          <div
            key={`${it.label}-${i}`}
            className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/40 text-primary">
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {it.label}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-extrabold leading-tight text-foreground">
                {it.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DetailCardsGrid;