import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Globe, Lock, MoreVertical, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ProfileJournalEntry {
  id: string;
  created_at: string;
  mood?: string | null;
  result?: string | null;
  pnl_pips?: number | null;
  pnl_unit?: string | null;
  market_pair?: string | null;
  session?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  share_setting?: string | null;
  account_type?: string | null;
  entry_type?: string | null;
  study_data?: Record<string, unknown> | null;
}

type Filter = "all" | "trade" | "study";
export type JournalVisibility = "private" | "partners" | "public";

const VISIBILITY: { value: JournalVisibility; label: string; Icon: typeof Lock }[] = [
  { value: "private", label: "Private", Icon: Lock },
  { value: "partners", label: "Partners", Icon: Users },
  { value: "public", label: "Public", Icon: Globe },
];

const titleFor = (entry: ProfileJournalEntry) => entry.market_pair || entry.result || entry.session || (entry.entry_type ? `${entry.entry_type} entry` : "Journal entry");

export default function ProfileJournalCards({ entries, emptyDescription = "Nothing shared here yet.", onSetVisibility, onHide }: { entries: ProfileJournalEntry[]; emptyDescription?: string; onSetVisibility?: (entry: ProfileJournalEntry, visibility: JournalVisibility) => void | Promise<void>; onHide?: (entry: ProfileJournalEntry) => void | Promise<void> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(() => entries.filter((entry) => filter === "all" || String(entry.entry_type || "trade").toLowerCase().includes(filter)), [entries, filter]);

  return (
    <div className="px-3 pb-6 pt-3">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><h2 className="text-sm font-extrabold text-foreground">Journal Activity</h2></div>
        {entries.length > 1 && <Button variant="outline" size="sm" className="h-7 rounded-full px-2.5 text-[9px]" onClick={() => setFilter((current) => current === "all" ? "trade" : current === "trade" ? "study" : "all")}><SlidersHorizontal className="h-3 w-3" />{filter === "all" ? "Filter" : filter === "trade" ? "Trades" : "Study"}</Button>}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-border bg-card px-8 py-10 text-center"><BookOpen className="mb-2 h-6 w-6 text-primary" /><p className="text-sm font-bold text-foreground">No journal entries yet</p><p className="mt-1 max-w-[240px] text-[11px] text-muted-foreground">{emptyDescription}</p></div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((entry) => {
            const positive = (entry.pnl_pips || 0) >= 0;
            const expanded = expandedId === entry.id;
            const amount = typeof entry.pnl_pips === "number" ? (entry.pnl_unit === "dollars" ? `${positive ? "+$" : "-$"}${Math.abs(entry.pnl_pips)}` : `${positive && entry.pnl_pips > 0 ? "+" : ""}${entry.pnl_pips} pips`) : null;
            return (
              <article key={entry.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5"><span>{new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">{entry.entry_type || "Trade"}</span>{entry.account_type && <span className="rounded-full bg-secondary px-2 py-0.5">{entry.account_type}</span>}{onSetVisibility && (() => { const v = VISIBILITY.find((o) => o.value === (entry.share_setting || "private")) || VISIBILITY[0]; return <span className="inline-flex items-center gap-1"><v.Icon className="h-2.5 w-2.5" />{v.label}</span>; })()}</div>
                  <div className="relative flex shrink-0 items-center gap-1">
                    {(onSetVisibility || onHide) && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMenuId(menuId === entry.id ? null : entry.id)} aria-label="Entry options"><MoreVertical className="h-3.5 w-3.5" /></Button>}
                    {menuId === entry.id && <div className="absolute right-0 top-7 z-20 min-w-[160px] overflow-hidden rounded-md border border-border bg-card shadow-lg">{onSetVisibility && VISIBILITY.filter((o) => o.value !== (entry.share_setting || "private")).map((o) => <Button key={o.value} variant="ghost" className="w-full justify-start rounded-none text-xs" onClick={async () => { setMenuId(null); await onSetVisibility(entry, o.value); }}><o.Icon />Make {o.label.toLowerCase()}</Button>)}{onHide && <Button variant="ghost" className="w-full justify-start rounded-none text-xs text-destructive" onClick={async () => { setMenuId(null); await onHide(entry); }}><Trash2 />Remove from profile</Button>}</div>}
                  </div>
                </div>
                <button type="button" className="mt-2 block w-full text-left" onClick={() => setExpandedId(expanded ? null : entry.id)}>
                  <h3 className="text-[13px] font-extrabold text-foreground">{titleFor(entry)}</h3>
                  {entry.notes && <p className={cn("mt-1 whitespace-pre-wrap text-[11px] leading-4 text-muted-foreground", !expanded && "line-clamp-2")}>{entry.notes}</p>}
                </button>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="flex flex-wrap gap-1">{[entry.market_pair, entry.session, entry.result, entry.mood, ...(entry.tags || [])].filter(Boolean).slice(0, expanded ? undefined : 4).map((tag) => <span key={String(tag)} className="rounded-full bg-secondary px-2 py-0.5 text-[8px] font-semibold text-foreground">{tag}</span>)}</div>
                  <div className="flex shrink-0 items-center gap-1">{amount && <span className={cn("text-[10px] font-black", positive ? "text-success" : "text-destructive")}>{amount}</span>}{(entry.notes || (entry.tags?.length || 0) > 4) && <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}