import { useState } from "react";
import { BookOpen, ChevronDown, Lock, MoreVertical, Trash2, Users } from "lucide-react";
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

export default function ProfileJournalCards({ entries, emptyDescription = "Nothing shared here yet.", onTogglePrivacy, onHide }: { entries: ProfileJournalEntry[]; emptyDescription?: string; onTogglePrivacy?: (entry: ProfileJournalEntry) => void | Promise<void>; onHide?: (entry: ProfileJournalEntry) => void | Promise<void> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  if (entries.length === 0) return <div className="flex flex-col items-center px-8 py-20 text-center"><BookOpen className="mb-3 h-7 w-7 text-primary" /><p className="font-bold text-foreground">No journal entries yet</p><p className="mt-1 max-w-[240px] text-xs text-muted-foreground">{emptyDescription}</p></div>;
  return (
    <div className="space-y-2.5 px-4 py-4 pb-8">
      <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><h2 className="text-sm font-extrabold text-foreground">Journal Activity</h2></div>
      {entries.map((entry) => {
        const positive = (entry.pnl_pips || 0) >= 0;
        const expanded = expandedId === entry.id;
        const amount = typeof entry.pnl_pips === "number" ? (entry.pnl_unit === "dollars" ? `${positive ? "+$" : "-$"}${Math.abs(entry.pnl_pips)}` : `${positive && entry.pnl_pips > 0 ? "+" : ""}${entry.pnl_pips} pips`) : null;
        return (
          <article key={entry.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
              <div className="flex flex-wrap items-center gap-1.5"><span>{new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">{entry.entry_type || "Trade"}</span>{entry.account_type && <span className="rounded-full bg-secondary px-2 py-0.5">{entry.account_type}</span>}{entry.share_setting === "private" && <span className="inline-flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Private</span>}</div>
              <div className="relative flex items-center gap-1">
                {amount && <span className={cn("shrink-0 text-xs font-black", positive ? "text-primary" : "text-destructive")}>{amount}</span>}
                {(onTogglePrivacy || onHide) && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMenuId(menuId === entry.id ? null : entry.id)} aria-label="Entry options"><MoreVertical className="h-4 w-4" /></Button>}
                {menuId === entry.id && <div className="absolute right-0 top-8 z-20 min-w-[160px] overflow-hidden rounded-md border border-border bg-card shadow-lg">{onTogglePrivacy && <Button variant="ghost" className="w-full justify-start rounded-none text-xs" onClick={async () => { setMenuId(null); await onTogglePrivacy(entry); }}>{entry.share_setting === "private" ? <Users /> : <Lock />}{entry.share_setting === "private" ? "Share with partners" : "Make private"}</Button>}{onHide && <Button variant="ghost" className="w-full justify-start rounded-none text-xs text-destructive" onClick={async () => { setMenuId(null); await onHide(entry); }}><Trash2 />Remove from profile</Button>}</div>}
              </div>
            </div>
            <h3 className="mt-2 text-[13px] font-extrabold text-foreground">{entry.market_pair || entry.result || entry.session || "Journal entry"}</h3>
            {entry.notes && <p className={cn("mt-1 whitespace-pre-wrap text-[11px] leading-4 text-muted-foreground", !expanded && "line-clamp-2")}>{entry.notes}</p>}
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="flex flex-wrap gap-1">{[entry.result, entry.mood, ...(entry.tags || [])].filter(Boolean).slice(0, expanded ? undefined : 4).map((tag) => <span key={String(tag)} className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-foreground">{tag}</span>)}</div>
              {(entry.notes || (entry.tags?.length || 0) > 4) && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setExpandedId(expanded ? null : entry.id)} aria-label={expanded ? "Collapse entry" : "Expand entry"}><ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} /></Button>}
            </div>
          </article>
        );
      })}
    </div>
  );
}