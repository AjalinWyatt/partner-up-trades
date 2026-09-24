import { BarChart3, Brain, CandlestickChart, Clock3, DollarSign, Target, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBreakdownLabel, type MatchResult } from "@/lib/matchUtils";
import type { ProfileJournalEntry } from "@/components/profile/ProfileJournalCards";
import { useState } from "react";

type DataRecord = Record<string, any> | null;

interface TraderDetailsPanelProps {
  profile: DataRecord;
  tradingProfile: DataRecord;
  mode: "overview" | "trading";
  match?: MatchResult | null;
  myTrading?: DataRecord;
  username?: string | null;
  journalEntries?: ProfileJournalEntry[];
  ownProfile?: boolean;
  onViewJournal?: () => void;
}

const asList = (value: unknown): string[] => Array.isArray(value) ? value.filter(Boolean).map(String) : typeof value === "string" && value.trim() ? value.split(", ").filter(Boolean) : [];
const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

const snapshotDefinitions = [
  { key: "markets", label: "Market", Icon: DollarSign },
  { key: "trading_style", label: "Style", Icon: CandlestickChart },
  { key: "experience_level", label: "Experience", Icon: BarChart3 },
  { key: "strategies", label: "Strategy", Icon: Brain },
  { key: "sessions", label: "Session", Icon: Clock3 },
  { key: "timeframes", label: "Timeframe", Icon: Timer },
];

const Section = ({ title, items }: { title: string; items: string[] }) => items.length ? (
  <section className="border-t border-border/60 py-4">
    <h3 className="mb-2 text-[12px] font-extrabold text-foreground">{title}</h3>
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">{items.map((item) => <span key={item} className="text-[11px] font-medium text-foreground/80">{item}</span>)}</div>
  </section>
) : null;

export default function TraderDetailsPanel({ profile, tradingProfile, mode, match, myTrading, username, journalEntries = [], ownProfile, onViewJournal }: TraderDetailsPanelProps) {
  const [showMatch, setShowMatch] = useState(false);
  const matchEntries = match ? Object.entries(match.breakdown).sort((a, b) => b[1] - a[1]) : [];
  const canShowMatch = !!match && matchEntries.length > 0 && match.pct > 0;
  const lookingFor = unique([...asList(tradingProfile?.connection_types), ...asList(tradingProfile?.looking_for_gender), ...asList(tradingProfile?.connection_reach), ...asList(tradingProfile?.match_priorities)]);
  const connecting = unique(asList(tradingProfile?.connect_frequency));
  const offCharts = unique([...asList(profile?.hobbies), ...asList(profile?.off_chart_prompts)]);
  const snapshot = snapshotDefinitions.flatMap(({ key, label, Icon }) => {
    const value = key === "experience_level" ? tradingProfile?.[key] : asList(tradingProfile?.[key])[0];
    return value ? [{ label, value: String(value), Icon }] : [];
  });

  if (mode === "trading") {
    const groups = [
      ["Instruments", asList(tradingProfile?.instruments)],
      ["Chart Focus", asList(profile?.chart_prompts)],
      ["When I Trade", asList(tradingProfile?.trade_times)],
      ["Trading Rhythm", asList(tradingProfile?.frequency)],
      ["Goals", asList(tradingProfile?.primary_goal)],
      ["Trading Habits", unique([...asList(tradingProfile?.journaling), ...asList(tradingProfile?.trading_plan)])],
      ["After a Loss", asList(tradingProfile?.loss_response)],
      ["Where I Want Support", asList(tradingProfile?.struggles)],
    ] as [string, string[]][];
    return (
      <div className="px-5 pb-8 pt-4">
        {snapshot.length > 0 && <section className="pb-4"><div className="mb-3 flex items-center gap-2"><CandlestickChart className="h-4 w-4 text-primary" /><h2 className="text-[12px] font-extrabold uppercase text-foreground">Trading Snapshot</h2></div><div className="grid grid-cols-3 gap-x-3 gap-y-3">{snapshot.map(({ label, value, Icon }) => <div key={label} className="min-w-0"><Icon className="mb-1 h-4 w-4 text-primary" /><p className="text-[8px] text-muted-foreground">{label}</p><p className="truncate text-[10px] font-bold text-foreground">{value}</p></div>)}</div></section>}
        {groups.map(([title, items]) => <Section key={title} title={title} items={items} />)}
        {!snapshot.length && !groups.some(([, items]) => items.length) && <p className="py-12 text-center text-xs text-muted-foreground">Trading details haven’t been added yet.</p>}
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 pt-4">
      {canShowMatch && <section className="pb-4">
        <div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase text-foreground">You + @{username || "trader"}</p><Button variant="link" className="h-auto p-0 text-[10px]" onClick={() => setShowMatch(true)}>Why this match?</Button></div>
        <div className="mt-2 flex items-center gap-3"><div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-primary"><span className="text-lg font-black leading-none text-foreground">{match.pct}%</span><span className="mt-0.5 text-[7px] font-bold text-primary">Compatible</span></div><p className="text-[12px] leading-[17px] text-foreground/85">{match.pct >= 80 ? "You align strongly where accountability matters most." : match.pct >= 65 ? "You share a solid base for trading accountability." : "You have useful overlap and complementary differences."}</p></div>
        {!!match.reasons.length && <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{match.reasons.slice(0, 5).join(" · ")}</p>}
      </section>}
      <Section title="Looking For" items={lookingFor} />
      <Section title="How I Like to Connect" items={connecting} />
      <Section title="Off the Charts" items={offCharts.slice(0, 6)} />
      {(journalEntries.length > 0 || ownProfile) && <section className="border-t border-border/60 py-4"><div className="flex items-center justify-between"><h3 className="text-[12px] font-extrabold text-foreground">{ownProfile ? "My Journal" : "Recent Journal Activity"}</h3><Button variant="link" className="h-auto p-0 text-[10px]" onClick={onViewJournal}>{ownProfile ? "View My Journal →" : "View Journal →"}</Button></div>{!ownProfile && journalEntries.slice(0, 2).map((entry) => <div key={entry.id} className="mt-2 flex items-start justify-between gap-3 border-t border-border/40 pt-2 first:border-0"><div className="min-w-0"><p className="truncate text-[11px] font-bold text-foreground">{entry.market_pair || entry.result || entry.session || "Journal entry"}</p><p className="line-clamp-1 text-[10px] text-muted-foreground">{entry.notes || entry.result || "Shared journal activity"}</p></div><span className="shrink-0 text-[9px] text-muted-foreground">{new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>)}</section>}
      {!canShowMatch && !lookingFor.length && !connecting.length && !offCharts.length && !journalEntries.length && !ownProfile && <p className="py-12 text-center text-xs text-muted-foreground">This trader hasn’t added more profile details yet.</p>}

      <Dialog open={showMatch} onOpenChange={setShowMatch}><DialogContent className="max-h-[80vh] max-w-sm overflow-y-auto border-border bg-card"><DialogHeader><DialogTitle>Why this match?</DialogTitle></DialogHeader><div className="space-y-3 pt-2">{matchEntries.map(([key, score]) => <div key={key}><div className="mb-1 flex justify-between gap-3 text-[10px]"><span className="font-bold capitalize text-foreground">{key}</span><span className="text-right text-muted-foreground">{getBreakdownLabel(key, score, myTrading, tradingProfile)}</span></div><div className="h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${score}%` }} /></div></div>)}</div></DialogContent></Dialog>
    </div>
  );
}