import { useState } from "react";
import { BarChart3, Brain, CandlestickChart, Clock3, DollarSign, Target, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBreakdownLabel, type MatchResult } from "@/lib/matchUtils";

type DataRecord = Record<string, any> | null;

interface TraderDetailsPanelProps {
  profile: DataRecord;
  tradingProfile: DataRecord;
  match?: MatchResult | null;
  myTrading?: DataRecord;
  username?: string | null;
  ownProfile?: boolean;
}

const asList = (value: unknown): string[] => Array.isArray(value)
  ? value.filter(Boolean).map(String)
  : typeof value === "string" && value.trim()
    ? value.split(", ").filter(Boolean)
    : [];

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

const snapshotDefinitions = [
  { key: "markets", label: "Market", Icon: DollarSign },
  { key: "trading_style", label: "Style", Icon: CandlestickChart },
  { key: "experience_level", label: "Experience", Icon: BarChart3 },
  { key: "strategies", label: "Strategy", Icon: Brain },
  { key: "sessions", label: "Session", Icon: Clock3 },
  { key: "timeframes", label: "Timeframe", Icon: Timer },
];

const detailGroups = (profile: DataRecord, tradingProfile: DataRecord): [string, string[]][] => [
  ["Instruments", asList(tradingProfile?.instruments)],
  ["Chart focus", asList(profile?.chart_prompts)],
  ["Trading times", asList(tradingProfile?.trade_times)],
  ["Trading frequency", asList(tradingProfile?.frequency)],
  ["Goals", asList(tradingProfile?.primary_goal)],
  ["Trading habits", unique([...asList(tradingProfile?.journaling), ...asList(tradingProfile?.trading_plan)])],
  ["After a loss", asList(tradingProfile?.loss_response)],
  ["Trading struggles", asList(tradingProfile?.struggles)],
  ["What I bring", asList(tradingProfile?.partnership_strengths)],
  ["Where a partner helps", asList(tradingProfile?.accountability_needs)],
  ["Looking for", asList(tradingProfile?.connection_types)],
  ["Partner preferences", unique([...asList(tradingProfile?.looking_for_gender), ...asList(tradingProfile?.connection_reach)])],
  ["Match priorities", asList(tradingProfile?.match_priorities)],
  ["Communication", asList(tradingProfile?.communication_preferences)],
  ["Check-ins", asList(tradingProfile?.connect_frequency)],
  ["Off the charts", unique([...asList(profile?.hobbies), ...asList(profile?.off_chart_prompts)])],
];

function MatchRing({ value }: { value: number }) {
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" className="stroke-secondary" strokeWidth="5" />
        <circle cx="32" cy="32" r={radius} fill="none" className="stroke-primary" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black leading-none text-foreground">{value}%</span>
        <span className="mt-1 text-[7px] font-bold text-primary">Compatible</span>
      </div>
    </div>
  );
}

export default function TraderDetailsPanel({ profile, tradingProfile, match, myTrading, username, ownProfile }: TraderDetailsPanelProps) {
  const [showMatch, setShowMatch] = useState(false);
  const [showTrading, setShowTrading] = useState(false);
  const matchEntries = match ? Object.entries(match.breakdown).sort((a, b) => b[1] - a[1]) : [];
  const canShowMatch = !ownProfile && !!match && matchEntries.length > 0 && match.pct > 0;
  const snapshot = snapshotDefinitions.flatMap(({ key, label, Icon }) => {
    const rawValue = key === "experience_level" ? tradingProfile?.[key] : asList(tradingProfile?.[key])[0];
    return rawValue ? [{ label, value: String(rawValue), Icon }] : [];
  });
  const groups = detailGroups(profile, tradingProfile).filter(([, items]) => items.length > 0);
  const summary = match && (match.pct >= 80
    ? "You line up strongly in the areas that matter most."
    : match.pct >= 65
      ? "You share a solid base for trading accountability."
      : "You have useful overlap and complementary differences.");

  return (
    <div className="space-y-3 px-3 pb-6 pt-3">
      {canShowMatch && (
        <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary" /><p className="text-[10px] font-extrabold uppercase text-foreground">You + @{username || "trader"}</p></div>
            <Button variant="link" className="h-auto p-0 text-[10px]" onClick={() => setShowMatch(true)}>Why this match?</Button>
          </div>
          <div className="mt-2.5 flex items-center gap-4">
            <MatchRing value={match.pct} />
            <p className="text-[12px] font-medium leading-[17px] text-foreground/85">{summary}</p>
          </div>
          {match.reasons.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {match.reasons.slice(0, 5).map((reason) => <span key={reason} className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-semibold text-foreground/85">{reason}</span>)}
            </div>
          )}
        </section>
      )}

      {snapshot.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><CandlestickChart className="h-4 w-4 text-primary" /><h2 className="text-[11px] font-extrabold uppercase text-foreground">Trading Snapshot</h2></div>
            {groups.length > 0 && <Button variant="link" className="h-auto p-0 text-[10px]" onClick={() => setShowTrading(true)}>View all</Button>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {snapshot.map(({ label, value, Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-2 rounded-md border border-border/70 bg-secondary/45 px-2 py-2">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0"><p className="text-[7px] leading-none text-muted-foreground">{label}</p><p className="mt-1 truncate text-[9px] font-bold leading-none text-foreground">{value}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!canShowMatch && snapshot.length === 0 && <p className="py-12 text-center text-xs text-muted-foreground">Trading details haven’t been added yet.</p>}

      <Dialog open={showMatch} onOpenChange={setShowMatch}>
        <DialogContent className="max-h-[82vh] max-w-sm overflow-y-auto border-border bg-card">
          <DialogHeader><DialogTitle>Why this match?</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">{matchEntries.map(([key, score]) => <div key={key}><div className="mb-1 flex justify-between gap-3 text-[10px]"><span className="font-bold capitalize text-foreground">{key}</span><span className="text-right text-muted-foreground">{getBreakdownLabel(key, score, myTrading, tradingProfile)}</span></div><div className="h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${score}%` }} /></div></div>)}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTrading} onOpenChange={setShowTrading}>
        <DialogContent className="max-h-[82vh] max-w-sm overflow-y-auto border-border bg-card">
          <DialogHeader><DialogTitle>Trading details</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">{groups.map(([title, items]) => <section key={title}><h3 className="mb-2 text-[10px] font-extrabold uppercase text-muted-foreground">{title}</h3><div className="flex flex-wrap gap-1.5">{items.map((item) => <span key={item} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold text-foreground">{item}</span>)}</div></section>)}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}