import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, Clock3, Globe, Lock, MoreHorizontal, SlidersHorizontal, Trash2, TrendingUp, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
  image_path?: string | null;
}

type Filter = "all" | "trade" | "study";
export type JournalVisibility = "private" | "partners" | "public";

const VISIBILITY: { value: JournalVisibility; label: string; Icon: typeof Lock }[] = [
  { value: "private", label: "Private", Icon: Lock },
  { value: "partners", label: "Partners", Icon: Users },
  { value: "public", label: "Public", Icon: Globe },
];

const isStudy = (e: ProfileJournalEntry) => String(e.entry_type || "").toLowerCase() === "study";
const studyTitle = (e: ProfileJournalEntry) => {
  const d = e.study_data || {};
  const v = d.topic || d.title || d.focus || d.study_type || d.type;
  return typeof v === "string" && v ? v : "Study session";
};
const instrument = (e: ProfileJournalEntry) => e.market_pair ? e.market_pair.split("·").pop()!.trim() : null;
const titleFor = (e: ProfileJournalEntry) => isStudy(e) ? studyTitle(e) : [instrument(e), e.session].filter(Boolean).join(" · ") || e.result || "Trade entry";

const badgeFor = (e: ProfileJournalEntry) => {
  if (isStudy(e)) return { label: "Study", cls: "border-info/30 bg-info/10 text-info", Icon: Clock3 };
  const a = (e.account_type || "Trade").trim();
  const l = a.toLowerCase();
  if (l === "live") return { label: "Live Account", cls: "border-success/30 bg-success/10 text-success", Icon: TrendingUp };
  if (l === "demo") return { label: "Demo", cls: "border-slate/30 bg-slate/10 text-slate", Icon: Wallet };
  return { label: a, cls: "border-primary/30 bg-primary/10 text-primary", Icon: Wallet };
};

const resultCls = (r: string) => {
  const l = r.toLowerCase();
  if (l.includes("win") || l.includes("profit")) return "border-success/30 bg-success/10 text-success";
  if (l.includes("loss") || l.includes("lesson")) return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-slate/30 bg-slate/10 text-slate";
};
const neutral = "border-surface-line bg-surface-raised text-foreground/80";

export default function ProfileJournalCards({ entries, emptyDescription = "Nothing shared here yet.", onSetVisibility, onHide }: { entries: ProfileJournalEntry[]; emptyDescription?: string; onSetVisibility?: (entry: ProfileJournalEntry, visibility: JournalVisibility) => void | Promise<void>; onHide?: (entry: ProfileJournalEntry) => void | Promise<void> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [images, setImages] = useState<Record<string, string>>({});
  const filtered = useMemo(() => entries.filter((e) => filter === "all" || (filter === "study" ? isStudy(e) : !isStudy(e))), [entries, filter]);

  // Signed URLs are only issued for images the database lets this viewer read.
  const pathsKey = entries.map((e) => e.image_path).filter(Boolean).join("|");
  useEffect(() => {
    const paths = [...new Set(entries.map((e) => e.image_path).filter(Boolean) as string[])];
    if (paths.length === 0) { setImages({}); return; }
    void supabase.storage.from("journal-media").createSignedUrls(paths, 3600).then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach((d) => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl; });
      setImages(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  return (
    <div className="px-3 pb-4 pt-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5"><BookOpen className="h-5 w-5 text-primary" strokeWidth={1.8} /><h2 className="text-[16px] font-bold text-foreground">Journal Activity</h2></div>
        {entries.length > 1 && <Button variant="outline" size="sm" className="h-8 rounded-full border-surface-line bg-surface px-3 text-[11px] font-medium" onClick={() => setFilter((c) => c === "all" ? "trade" : c === "trade" ? "study" : "all")}><SlidersHorizontal className="h-3.5 w-3.5" />{filter === "all" ? "Filter" : filter === "trade" ? "Trades" : "Study"}</Button>}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-surface-line bg-surface px-6 py-6 text-center"><BookOpen className="mb-1.5 h-5 w-5 text-primary" /><p className="text-[13px] font-semibold text-foreground">No journal entries yet</p><p className="mt-0.5 max-w-[240px] text-[11px] text-muted-foreground">{emptyDescription}</p></div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((entry) => {
            const expanded = expandedId === entry.id;
            const badge = badgeFor(entry);
            const img = entry.image_path ? images[entry.image_path] : null;
            const pips = typeof entry.pnl_pips === "number" && entry.pnl_pips !== 0 ? entry.pnl_pips : null;
            const amount = pips !== null ? (entry.pnl_unit === "dollars" ? `${pips > 0 ? "+$" : "-$"}${Math.abs(pips)}` : `${pips > 0 ? "+" : ""}${pips} pips`) : null;
            const tags: { label: string; cls: string }[] = [];
            const inst = instrument(entry);
            if (inst) tags.push({ label: inst, cls: neutral });
            if (amount) tags.push({ label: amount, cls: pips! > 0 ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive" });
            if (entry.result) tags.push({ label: entry.result, cls: resultCls(entry.result) });
            (entry.tags || []).forEach((t) => tags.push({ label: t, cls: neutral }));
            const vis = VISIBILITY.find((o) => o.value === (entry.share_setting || "private")) || VISIBILITY[0];
            return (
              <article key={entry.id} className="rounded-xl border border-surface-line bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", badge.cls)}><badge.Icon className="h-3 w-3" />{badge.label}</span>
                    {onSetVisibility && <span className="inline-flex items-center gap-1 text-[10px] text-slate"><vis.Icon className="h-3 w-3" />{vis.label}</span>}
                  </div>
                  {(onSetVisibility || onHide) && (
                    <div className="relative shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setMenuId(menuId === entry.id ? null : entry.id)} aria-label="Entry options"><MoreHorizontal className="h-4 w-4" /></Button>
                      {menuId === entry.id && <div className="absolute right-0 top-7 z-20 min-w-[160px] overflow-hidden rounded-md border border-surface-line bg-surface-raised shadow-lg">{onSetVisibility && VISIBILITY.filter((o) => o.value !== (entry.share_setting || "private")).map((o) => <Button key={o.value} variant="ghost" className="w-full justify-start rounded-none text-xs" onClick={async () => { setMenuId(null); await onSetVisibility(entry, o.value); }}><o.Icon />Make {o.label.toLowerCase()}</Button>)}{onHide && <Button variant="ghost" className="w-full justify-start rounded-none text-xs text-destructive" onClick={async () => { setMenuId(null); await onHide(entry); }}><Trash2 />Remove from profile</Button>}</div>}
                    </div>
                  )}
                </div>
                <button type="button" className="mt-2 flex w-full gap-3 text-left" onClick={() => setExpandedId(expanded ? null : entry.id)}>
                  {img && !expanded && <img src={img} alt="Journal attachment" loading="lazy" className="h-[84px] w-[84px] shrink-0 rounded-lg border border-surface-line object-cover" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[14px] font-bold text-foreground">{titleFor(entry)}</h3>
                    {entry.notes && <p className={cn("mt-0.5 whitespace-pre-wrap text-[12px] leading-[17px] text-muted-foreground", !expanded && "line-clamp-3")}>{entry.notes}</p>}
                  </div>
                </button>
                {expanded && img && <img src={img} alt="Journal attachment" className="mt-2 w-full rounded-lg border border-surface-line object-cover" />}
                {tags.length > 0 && (
                  <div className={cn("mt-2 flex flex-wrap gap-1.5", img && !expanded && "pl-[96px]")}>
                    {tags.slice(0, expanded ? undefined : 4).map((t) => <span key={t.label} className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium", t.cls)}>{t.label}</span>)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
