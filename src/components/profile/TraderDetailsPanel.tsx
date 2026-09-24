import { useState } from "react";
import { AlertCircle, BarChart3, Brain, CalendarDays, CandlestickChart, Clock3, Crosshair, DollarSign, Gem, Handshake, MessageSquare, Search, Sparkles, Target, Timer, Trophy, UserCheck, Users } from "lucide-react";
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
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="match-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--success))" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="hsl(var(--surface-line))" strokeWidth="4.5" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke="url(#match-ring)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} style={{ filter: "drop-shadow(0 0 3px hsl(var(--success) / 0.45))" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-bold leading-none text-foreground">{value}<span className="text-[13px]">%</span></span>
        <span className="mt-1 text-[9px] font-medium text-success">Compatible</span>
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
  const g = Object.fromEntries(detailGroups(profile, tradingProfile));
  const tile = (label: string, key: string, Icon: any) => ({ label, Icon, values: g[key] || [] });
  const sections = [
    { title: "Trading", subtitle: "Markets, style and approach", Icon: BarChart3, items: [tile("Instruments", "Instruments", BarChart3), tile("Chart Focus", "Chart focus", Crosshair), tile("Trading Times", "Trading times", Clock3), tile("Frequency", "Trading frequency", CalendarDays)] },
    { title: "Goals & Habits", subtitle: "Mindset, routine and growth", Icon: Target, items: [tile("Goals", "Goals", Trophy), tile("Trading Habits", "Trading habits", BarChart3), tile("After a Loss", "After a loss", Brain), tile("Trading Struggles", "Trading struggles", AlertCircle)] },
    { title: "Partnership", subtitle: "How we can trade better together", Icon: Users, items: [tile("What I Bring", "What I bring", Gem), tile("Where a Partner Helps", "Where a partner helps", Handshake), tile("Looking For", "Looking for", Search), tile("Communication", "Communication", MessageSquare), tile("Partner Preferences", "Partner preferences", Users), tile("Match Priorities", "Match priorities", Target), tile("Check-ins", "Check-ins", UserCheck), tile("Off the Charts", "Off the charts", Sparkles)] },
  ];
  const strong = matchEntries.filter(([, s]) => s >= 60).length;
  const summary = match && (strong > 0
    ? `You line up on ${strong} of ${matchEntries.length} key areas.`
    : "You have useful overlap and complementary differences.");
  const interests = ownProfile ? unique([
    ...asList(profile?.chart_prompts),
    ...asList(profile?.off_chart_prompts),
    ...asList(profile?.hobbies),
  ]).slice(0, 8) : [];

  return (
    <div className="space-y-2.5 px-3 pb-4 pt-3">
      {canShowMatch && (
        <section className="rounded-xl border border-surface-line bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">You + {(username || "trader").toUpperCase()}</p></div>
            <button type="button" className="text-[12px] font-medium text-info hover:underline" onClick={() => setShowMatch(true)}>Why this match?</button>
          </div>
          <div className="mt-2 flex items-center gap-4">
            <MatchRing value={match.pct} />
            <p className="text-[14px] leading-[20px] text-foreground/90">{summary}</p>
          </div>
          {match.reasons.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {match.reasons.slice(0, 5).map((reason) => <span key={reason} className="rounded-full border border-success/25 bg-success/[0.07] px-3 py-1 text-[11px] font-medium text-foreground/90">{reason}</span>)}
            </div>
          )}
        </section>
      )}

      {snapshot.length > 0 && (
        <section className="rounded-xl border border-surface-line bg-surface p-2.5">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">Trading Snapshot</h2></div>
            {groups.length > 0 && <button type="button" className="text-[12px] font-medium text-info hover:underline" onClick={() => setShowTrading(true)}>View all</button>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {snapshot.map(({ label, value, Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-2 rounded-lg border border-surface-line/70 bg-surface-raised px-2 py-2">
                <Icon className="h-[18px] w-[18px] shrink-0 text-primary" strokeWidth={1.8} />
                <div className="min-w-0"><p className="text-[9px] leading-none text-muted-foreground">{label}</p><p className="mt-1 truncate text-[11px] font-semibold leading-none text-foreground">{value}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {ownProfile && interests.length > 0 && (
        <section className="rounded-xl border border-surface-line bg-surface p-3">
          <div className="mb-2.5 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">Interests &amp; Focus</h2></div>
          <div className="flex flex-wrap gap-1.5">
            {interests.map((interest) => <span key={interest} className="rounded-full border border-surface-line bg-surface-raised px-3 py-1.5 text-[11px] text-foreground/85">{interest}</span>)}
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
        <DialogContent className="max-h-[92dvh] max-w-sm border-surface-line bg-background p-2.5 pt-3">
          <DialogHeader className="pb-0"><DialogTitle className="text-center text-[15px] font-semibold">Trading details</DialogTitle></DialogHeader>
          <svg width="0" height="0" className="absolute"><defs><linearGradient id="td-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="hsl(174 72% 58%)" /><stop offset="100%" stopColor="hsl(150 70% 55%)" /></linearGradient></defs></svg>
          <div className="space-y-1.5">
            {sections.map(({ title, subtitle, Icon, items }) => {
              const tiles = items.filter((t) => t.values.length > 0);
              if (!tiles.length) return null;
              return (
                <section key={title} className="rounded-xl border border-[hsl(190_30%_22%/0.6)] bg-[hsl(195_35%_10%)] p-1.5">
                  <div className="mb-1.5 flex items-center gap-2 px-1">
                    <Icon className="h-5 w-5 shrink-0" stroke="url(#td-grad)" strokeWidth={2.25} />
                    <div className="flex items-baseline gap-1.5"><h3 className="text-[12.5px] font-semibold leading-none text-foreground">{title}</h3><p className="text-[9.5px] leading-none text-muted-foreground">{subtitle}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {tiles.map(({ label, Icon: TileIcon, values }, i) => (
                      <div key={label} className={`rounded-lg border border-[hsl(190_25%_22%/0.6)] bg-[hsl(195_30%_13%)] p-1.5 ${tiles.length % 2 === 1 && i === tiles.length - 1 ? "col-span-2" : ""}`}>
                        <div className="mb-1 flex items-center gap-1 px-0.5"><TileIcon className="h-3 w-3 shrink-0" stroke="url(#td-grad)" /><p className="text-[10px] font-semibold leading-none text-foreground">{label}</p></div>
                        <div className="flex flex-wrap gap-0.5">{values.map((v) => <span key={v} className="rounded-full border border-[hsl(200_15%_28%/0.7)] bg-[hsl(200_20%_17%)] px-1.5 py-0.5 text-[9px] leading-tight text-foreground/90">{v}</span>)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}