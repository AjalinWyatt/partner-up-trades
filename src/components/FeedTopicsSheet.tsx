import { Search, TrendingUp, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface FeedTopicsSheetProps {
  currentMarket?: string;
  open: boolean;
  onClose: () => void;
}

const TOPIC_GROUPS = [
  { name: "For you", meta: "Recommended from your feed", accent: "primary" },
  { name: "Following", meta: "People and setups you keep up with", accent: "accent" },
  { name: "Forex", meta: "London open, majors, macro", accent: "success" },
  { name: "Futures", meta: "NQ, ES, order flow", accent: "primary" },
  { name: "Options", meta: "Gamma, swings, volatility", accent: "accent" },
  { name: "Crypto", meta: "BTC, alts, market structure", accent: "success" },
  { name: "Indices", meta: "DXY, NAS100, US30, SPX", accent: "primary" },
  { name: "Trading plan", meta: "Execution rules and routines", accent: "accent" },
  { name: "Chartwork", meta: "Setups, markups, and reviews", accent: "success" },
  { name: "Mindset", meta: "Discipline, psychology, consistency", accent: "primary" },
];

export default function FeedTopicsSheet({ currentMarket, open, onClose }: FeedTopicsSheetProps) {
  const [query, setQuery] = useState("");

  const filteredTopics = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return TOPIC_GROUPS.filter((topic) => {
      if (!normalized) return true;
      return topic.name.toLowerCase().includes(normalized) || topic.meta.toLowerCase().includes(normalized);
    });
  }, [query]);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="left" className="w-[88vw] max-w-sm border-border bg-background px-0">
        <div className="border-b border-border px-5 pb-4 pt-8">
          <SheetTitle className="text-left text-3xl font-extrabold text-foreground">Feeds</SheetTitle>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          {currentMarket && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              {currentMarket}
            </div>
          )}
        </div>

        <div className="px-5 py-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Topics</span>
            <span className="text-xs text-muted-foreground">{filteredTopics.length} shown</span>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-border bg-card">
            {filteredTopics.map((topic, index) => (
              <button
                key={topic.name}
                onClick={onClose}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div>
                  <div className="text-lg font-bold text-foreground">{topic.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{topic.meta}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <Users className="h-4 w-4" />
                </div>
                {index < filteredTopics.length - 1 && <div className="absolute inset-x-4 bottom-0 border-b border-border/70" />}
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}