import { useState } from "react";
import { BarChart3, Brain, CandlestickChart, ChevronDown, Clock3, DollarSign, Target, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBreakdownLabel, type MatchResult } from "@/lib/matchUtils";

type DataRecord = Record<string, any> | null;

interface TraderDetailsPanelProps {
  profile: DataRecord;
  tradingProfile: DataRecord;
  match?: MatchResult | null;
  myTrading?: DataRecord;
  username?: string | null;
}

const snapshotDefinitions = [
  { key: "markets", label: "Market", Icon: DollarSign },
  { key: "trading_style", label: "Style", Icon: CandlestickChart },
  { key: "experience_level", label: "Experience", Icon: BarChart3 },
  { key: "strategies", label: "Strategy", Icon: Brain },
  { key: "sessions", label: "Session", Icon: Clock3 },
  { key: "timeframes", label: "Timeframe", Icon: Timer },
];

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
};

export default function TraderDetailsPanel({ profile, tradingProfile, match, myTrading, username }: TraderDetailsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const snapshot = snapshotDefinitions.flatMap(({ key, label, Icon }) => {
    const value = key === "experience_level" ? tradingProfile?.[key] : asList(tradingProfile?.[key])[0];
    return value ? [{ label, value: String(value), Icon }] : [];
  });
  const sections = [
    { title: "Looking For", Icon: Users, rows: [["Partner preference", tradingProfile?.looking_for_gender], ["Connection reach", tradingProfile?.connection_reach], ["Connection types", asList(tradingProfile?.connection_types)], ["Match priorities", asList(tradingProfile?.match_priorities)]] },
    { title: "Trading Habits", Icon: CandlestickChart, rows: [["Instruments", asList(tradingProfile?.instruments)], ["Charts", asList(profile?.chart_prompts)], ["Trade times", asList(tradingProfile?.trade_times)], ["Frequency", asList(tradingProfile?.frequency)]] },
    { title: "Growth & Support", Icon: Target, rows: [["Goals", asList(tradingProfile?.primary_goal)], ["Loss response", tradingProfile?.loss_response], ["Struggles", asList(tradingProfile?.struggles)], ["Journaling", asList(tradingProfile?.journaling)], ["Trading plan", asList(tradingProfile?.trading_plan)]] },
    { title: "How I Like to Connect", Icon: Users, rows: [["Check-ins", asList(tradingProfile?.connect_frequency)]] },
    { title: "Off the Charts", Icon: Users, rows: [["Interests", asList(profile?.hobbies)], ["More about me", asList(profile?.off_chart_prompts)]] },
  ].map((section) => ({ ...section, rows: section.rows.filter(([, value]) => asList(value).length > 0) })).filter((section) => section.rows.length > 0);

  const matchEntries = match ? Object.entries(match.breakdown).sort((a, b) => b[1] - a[1]) : [];
  const canShowMatch = !!match && matchEntries.length > 0 && match.pct > 0;

  return (
    <div className="space-y-3 px-4 py-4 pb-8">
      {canShowMatch && (
        <section className="rounded-lg border border-primary/20 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-extrabold uppercase text-foreground">You + @{username || "trader"}</p>
            <Button variant="ghost" size="sm" className="h-auto px-0 text-[11px] text-primary" onClick={() => setShowMatch((value) => !value)}>
              Why this match?
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-primary bg-secondary/60">
              <span className="text-xl font-black text-foreground">{match.pct}%</span>
              <span className="text-[8px] font-bold text-primary">Compatible</span>
            </div>
            <p className="text-[13px] font-medium leading-5 text-foreground">
              {match.pct >= 80 ? "You line up strongly across the areas that matter most." : match.pct >= 65 ? "You share a solid foundation for accountability." : "You have useful overlap with a few meaningful differences."}
            </p>
          </div>
          {match.reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {match.reasons.slice(0, 5).map((reason) => <span key={reason} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-foreground">{reason}</span>)}
            </div>
          )}
          {showMatch && (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              {matchEntries.map(([key, score]) => (
                <div key={key} className="grid grid-cols-[76px_1fr_auto] items-center gap-2 text-[10px]">
                  <span className="font-bold text-foreground">{key}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} /></div>
                  <span className="max-w-[100px] text-right text-muted-foreground">{getBreakdownLabel(key, score, myTrading, tradingProfile)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {snapshot.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase text-foreground">Trading Snapshot</p>
            {sections.length > 0 && <Button variant="ghost" size="sm" className="h-auto px-0 text-[11px] text-primary" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show less" : "View all"}</Button>}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {snapshot.map(({ label, value, Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-2 rounded-md border border-border/70 bg-secondary/35 p-2">
                <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                <div className="min-w-0"><p className="text-[8px] text-muted-foreground">{label}</p><p className="truncate text-[10px] font-bold text-foreground">{value}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showAll && sections.map(({ title, Icon, rows }) => (
        <section key={title} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h3 className="text-xs font-extrabold text-foreground">{title}</h3></div>
          <div className="space-y-3">
            {rows.map(([label, value]) => <div key={String(label)}><p className="mb-1 text-[9px] font-bold uppercase text-muted-foreground">{String(label)}</p><div className="flex flex-wrap gap-1.5">{asList(value).map((item) => <span key={item} className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-foreground">{item}</span>)}</div></div>)}
          </div>
        </section>
      ))}

      {snapshot.length === 0 && sections.length === 0 && <div className="py-16 text-center"><p className="font-bold text-foreground">No details yet</p><p className="mt-1 text-xs text-muted-foreground">Trading details will appear here.</p></div>}
      {sections.length > 0 && !showAll && <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setShowAll(true)}>View full profile <ChevronDown className="h-4 w-4" /></Button>}
    </div>
  );
}