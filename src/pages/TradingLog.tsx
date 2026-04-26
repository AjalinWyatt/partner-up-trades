import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Lock, Link, BookOpen, TrendingUp, MoreVertical, Pencil, Trash2, ChevronDown } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AppHeader from "@/components/AppHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

interface JournalEntry {
  id: string;
  mood: string | null;
  result: string | null;
  pnl_pips: number | null;
  market_pair: string | null;
  session: string | null;
  tags: string[];
  notes: string | null;
  share_setting: string | null;
  created_at: string;
  pnl_unit?: string | null;
  entry_type?: string | null;
  study_data?: any;
  account_type?: string | null;
}

const MOODS = [
  { value: "rough", emoji: "😤", label: "Rough" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "great", emoji: "🔥", label: "Great" },
];

const RESULTS = [
  { value: "Win", className: "win" },
  { value: "Loss", className: "loss" },
  { value: "Break Even", className: "be" },
];

const ACCOUNT_TYPES = ["Demo", "Challenge", "Funded", "Live"];
const MARKETS = ["Forex", "Futures", "Options", "Crypto", "Stocks", "Indices"];

const PAIR_SUGGESTIONS: Record<string, string[]> = {
  Forex: ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "GBP/JPY", "AUD/USD", "USD/CAD", "EUR/JPY"],
  Futures: ["NQ", "ES", "YM", "RTY", "CL", "GC", "MNQ", "MES"],
  Options: ["SPY", "QQQ", "TSLA", "NVDA", "AAPL", "AMZN", "META", "MSFT"],
  Crypto: ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD", "BNB/USD"],
  Stocks: ["AAPL", "TSLA", "NVDA", "AMZN", "MSFT", "GOOGL", "META", "AMD"],
  Indices: ["SPX", "NDX", "DJI", "RUT", "VIX", "DAX", "FTSE", "NKY"],
};

// Study log options
const STUDY_TYPES = [
  { value: "backtest", emoji: "🔬", label: "Backtest" },
  { value: "chart_review", emoji: "📊", label: "Chart Review" },
  { value: "strategy", emoji: "🧠", label: "Strategy" },
  { value: "psychology", emoji: "🧘", label: "Psychology" },
  { value: "course", emoji: "🎓", label: "Course" },
  { value: "book", emoji: "📖", label: "Book" },
  { value: "video", emoji: "🎥", label: "Video" },
  { value: "journal_review", emoji: "🔁", label: "Journal Review" },
];
const STUDY_DURATIONS = ["15m", "30m", "1h", "2h", "3h+"];
const STUDY_TOPICS = [
  "Price Action", "Order Blocks", "Liquidity", "Fair Value Gaps", "Supply/Demand",
  "ICT", "SMC", "Wyckoff", "Elliott Wave", "Volume Profile", "Risk Management",
  "Position Sizing", "Mindset", "Trade Plan", "Backtesting", "Indicators",
  "Market Structure", "Trendlines", "Fibonacci", "News Trading",
];
const STUDY_CONFIDENCE = [
  { value: 1, label: "Confused", emoji: "😵" },
  { value: 2, label: "Learning", emoji: "🤔" },
  { value: 3, label: "Getting it", emoji: "💡" },
  { value: 4, label: "Solid", emoji: "💪" },
  { value: 5, label: "Mastered", emoji: "🏆" },
];

const GREEN_TAGS = [
  "Followed plan", "Clean entry", "Held to TP", "Took partials", "Patient",
  "Let it run", "Good risk management", "Waited for confirmation",
  "Stuck to sizing", "Trusted the setup", "Journaled before trading", "No revenge trade",
];
const RED_TAGS = [
  "FOMO entry", "Moved stop", "Revenge trade", "Cut early", "Overtraded",
  "Sized up too fast", "No plan", "Chased price", "Broke rules",
  "Emotional trade", "Didn't journal", "Tilted after loss", "Entered too early", "Exited too early",
];
const ALL_TAGS = [...GREEN_TAGS, ...RED_TAGS];

function getTagType(tag: string): "green" | "red" | "neutral" {
  if (GREEN_TAGS.includes(tag)) return "green";
  if (RED_TAGS.includes(tag)) return "red";
  return "neutral";
}

function getMoodDotColor(mood: string | null) {
  if (mood === "great" || mood === "good") return "bg-accent";
  if (mood === "okay") return "bg-primary";
  return "bg-destructive";
}

function getMoodText(mood: string | null) {
  const m = MOODS.find((x) => x.value === mood);
  if (!m) return mood || "";
  if (mood === "great") return "Feeling great";
  if (mood === "good") return "Good day";
  if (mood === "okay") return "Okay";
  return "Frustrated";
}

function formatEntryDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });

  if (entryDay.getTime() === today.getTime()) return `Today · ${time}`;
  if (entryDay.getTime() === yesterday.getTime()) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}

export default function TradingLog() {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logView, setLogView] = useState<"trade" | "study">("trade");
  const [statsRange, setStatsRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [showRangeMenu, setShowRangeMenu] = useState(false);

  // Form state
  const [entryType, setEntryType] = useState<"trade" | "study">("trade");
  const [mood, setMood] = useState("");
  const [result, setResult] = useState("");
  const [pnl, setPnl] = useState("");
  const [pnlUnit] = useState<"pips" | "dollars">("dollars");
  const [marketName, setMarketName] = useState("");
  const [pairName, setPairName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [shareSetting, setShareSetting] = useState("partners");
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);

  // Study form state
  const [studyType, setStudyType] = useState("");
  const [studyTopics, setStudyTopics] = useState<string[]>([]);
  const [studyDuration, setStudyDuration] = useState("");
  const [studyConfidence, setStudyConfidence] = useState<number>(0);
  const [studyTakeaway, setStudyTakeaway] = useState("");
  const [studyResource, setStudyResource] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { navigate("/sign-in"); return; }
      setUserId(data.session.user.id);
    });
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    loadEntries();
    loadPartners();
  }, [userId]);

  async function loadPartners() {
    if (!userId) return;
    const { data: conns } = await supabase
      .from("partner_connections")
      .select("requester_id, receiver_id")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted");
    if (!conns || conns.length === 0) { setPartners([]); return; }
    const partnerIds = conns.map(c => c.requester_id === userId ? c.receiver_id : c.requester_id);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", partnerIds);
    setPartners((profiles || []).map(p => ({ id: p.id, name: p.full_name || "Partner" })));
  }

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    setEntries((data as JournalEntry[]) || []);
    setLoading(false);
  }

  // Streak
  function getStreak() {
    if (entries.length === 0) return 0;
    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      const day = new Date(today); day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      const hasEntry = entries.some((e) => new Date(e.created_at).toISOString().split("T")[0] === dayStr);
      if (hasEntry) streak++;
      else if (i > 0) break;
    }
    return streak;
  }

  function getWeekDots() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    // Monday-start week (handle Sunday = 0 -> go back 6 days)
    const dow = today.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    startOfWeek.setDate(today.getDate() + diffToMon);
    const dots = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek); day.setDate(day.getDate() + i);
      const dayStr = day.toISOString().split("T")[0];
      const todayStr = today.toISOString().split("T")[0];
      const logged = entries.some((e) => new Date(e.created_at).toISOString().split("T")[0] === dayStr);
      dots.push({ logged, isToday: dayStr === todayStr });
    }
    return dots;
  }

  function getWeekStats() {
    const today = new Date();
    const start = new Date(today);
    if (statsRange === "daily") {
      start.setHours(0, 0, 0, 0);
    } else if (statsRange === "monthly") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      const dow = today.getDay();
      const diffToMon = dow === 0 ? -6 : 1 - dow;
      start.setDate(today.getDate() + diffToMon);
      start.setHours(0, 0, 0, 0);
    }
    const allWeek = entries.filter((e) => new Date(e.created_at) >= start);
    const weekEntries = allWeek.filter((e) => (e.entry_type || "trade") === "trade");
    const studyEntries = allWeek.filter((e) => e.entry_type === "study");
    const studyCount = studyEntries.length;
    const DURATION_MINS: Record<string, number> = { "15m": 15, "30m": 30, "1h": 60, "2h": 120, "3h+": 180 };
    const studyMins = studyEntries.reduce((sum, e) => sum + (DURATION_MINS[e.study_data?.duration] || 0), 0);
    const pipsEntries = weekEntries.filter((e) => (e.pnl_unit || "pips") === "pips");
    const dollarEntries = weekEntries.filter((e) => e.pnl_unit === "dollars");
    const totalPips = pipsEntries.reduce((sum, e) => sum + (e.pnl_pips || 0), 0);
    const totalDollars = dollarEntries.reduce((sum, e) => sum + (e.pnl_pips || 0), 0);
    const totalTrades = weekEntries.length;
    const wins = weekEntries.filter((e) => e.result === "Win").length;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    return { totalPips, totalDollars, totalTrades, winRate, studyCount, studyMins };
  }

  async function saveEntry() {
    if (!userId) return;
    setSaving(true);
    const marketPairStr = [marketName, pairName].filter(Boolean).join(" · ");
    // Apply sign automatically based on result
    let pnlValue: number | null = pnl ? parseFloat(pnl) : null;
    if (pnlValue !== null && !isNaN(pnlValue)) {
      const abs = Math.abs(pnlValue);
      if (result === "Win") pnlValue = abs;
      else if (result === "Loss") pnlValue = -abs;
    }
    const studyData = entryType === "study" ? {
      study_type: studyType || null,
      topics: studyTopics,
      duration: studyDuration || null,
      confidence: studyConfidence || null,
      takeaway: studyTakeaway || null,
      resource: studyResource || null,
    } : {};

    const payload: any = {
      user_id: userId,
      mood: mood || null,
      result: entryType === "trade" ? (result || null) : null,
      pnl_pips: entryType === "trade" ? pnlValue : null,
      pnl_unit: pnlUnit,
      market_pair: entryType === "trade" ? (marketPairStr || null) : null,
      session: null,
      tags: entryType === "trade" ? selectedTags : [],
      notes: notes || null,
      share_setting: shareSetting,
      account_type: entryType === "trade" ? (accountType || null) : null,
      entry_type: entryType,
      study_data: studyData,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("journal_entries").update(payload).eq("id", editingId).eq("user_id", userId));
    } else {
      ({ error } = await supabase.from("journal_entries").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(editingId ? "Failed to update entry" : "Failed to save entry"); return; }
    toast.success(editingId ? "Entry updated" : (entryType === "study" ? "Study logged!" : "Trade logged!"));
    const wasEditing = !!editingId;
    setShowForm(false);
    resetForm();
    loadEntries();
    if (wasEditing) return;

    // Notify accepted partners that I just logged
    const { data: myProf } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
    const myName = myProf?.full_name || "Your partner";
    const { data: conns } = await supabase
      .from("partner_connections")
      .select("requester_id, receiver_id")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted");
    for (const c of conns || []) {
      const partnerId = c.requester_id === userId ? c.receiver_id : c.requester_id;
      sendNotification({
        userId: partnerId,
        type: "partner_logged",
        title: `${myName} just logged their session 📈`,
        body: "Hold yourself accountable - log yours too",
        relatedUserId: userId,
      });
    }

    // Check streak milestones
    const currentStreak = getStreak() + 1; // +1 for the entry we just saved
    if ([7, 14, 30].includes(currentStreak)) {
      sendNotification({
        userId,
        type: "streak_milestone",
        title: `🔥 ${currentStreak} day streak!`,
        body: `You've logged ${currentStreak} days in a row. Keep going.`,
      });
    }
  }

  function resetForm() {
    setMood(""); setResult(""); setPnl(""); setMarketName(""); setPairName("");
    setAccountType(""); setSelectedTags([]); setNotes(""); setShareSetting("partners");
    setEntryType("trade");
    setStudyType(""); setStudyTopics([]); setStudyDuration("");
    setStudyConfidence(0); setStudyTakeaway(""); setStudyResource("");
    setEditingId(null);
  }

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setEntryType((entry.entry_type as any) === "study" ? "study" : "trade");
    setMood(entry.mood || "");
    setResult(entry.result || "");
    const p = entry.pnl_pips;
    setPnl(p == null ? "" : String(Math.abs(p)));
    const mp = entry.market_pair || "";
    const [mk, ...rest] = mp.split(" · ");
    setMarketName(MARKETS.includes(mk) ? mk : "");
    setPairName(MARKETS.includes(mk) ? rest.join(" · ") : mp);
    setAccountType(entry.account_type || "");
    setSelectedTags(entry.tags || []);
    setNotes(entry.notes || "");
    setShareSetting(entry.share_setting || "partners");
    const sd = entry.study_data || {};
    setStudyType(sd.study_type || "");
    setStudyTopics(sd.topics || []);
    setStudyDuration(sd.duration || "");
    setStudyConfidence(sd.confidence || 0);
    setStudyTakeaway(sd.takeaway || "");
    setStudyResource(sd.resource || "");
    setOpenMenuId(null);
    setShowForm(true);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    setOpenMenuId(null);
    const { error } = await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", userId!);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Entry deleted");
    loadEntries();
  }

  const streak = getStreak();
  const weekDots = getWeekDots();
  const stats = getWeekStats();

  // Most-used pairs from prior entries (optionally filtered by current market)
  function getRecentPairs(forMarket?: string): string[] {
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (!e.market_pair) continue;
      const parts = e.market_pair.split(" · ").map((s) => s.trim()).filter(Boolean);
      const mk = parts[0];
      const pr = parts.slice(1).join(" · ");
      const pair = pr || (MARKETS.includes(mk) ? "" : mk);
      if (!pair) continue;
      if (forMarket && MARKETS.includes(mk) && mk !== forMarket) continue;
      counts.set(pair, (counts.get(pair) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([p]) => p);
  }
  const recentPairs = getRecentPairs(marketName || undefined);

  // ─── FORM VIEW ───
  if (showForm) {
    return (
      <div className="flex h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-hidden overscroll-none bg-background touch-pan-y">
        {/* Form header */}
        <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-3 overflow-hidden px-5 pb-2 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1rem))] lg:pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center">
              <X className="w-[22px] h-[22px] text-foreground" strokeWidth={2} />
            </button>
            <span className="min-w-0 truncate text-base font-extrabold text-foreground" style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {editingId ? `Edit ${entryType === "study" ? "Study" : "Trade"}` : (entryType === "study" ? "Log Study" : "Log Trade")}
            </span>
          </div>
          <button
            onClick={saveEntry}
            disabled={saving}
            className="shrink-0 rounded-lg bg-accent px-4 py-1.5 text-[13px] font-bold text-accent-foreground disabled:opacity-50"
          >
            Save
          </button>
        </div>

        <div className="min-h-0 w-full min-w-0 max-w-full flex-1 space-y-3.5 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] touch-pan-y" style={{ scrollbarWidth: "none" }}>
          {/* Entry type toggle */}
          <div className="flex w-full min-w-0 gap-2 overflow-hidden rounded-2xl border border-border bg-secondary p-1">
            {([
              { value: "trade", label: "Trade Log", icon: TrendingUp, emoji: "📈" },
              { value: "study", label: "Study Log", icon: BookOpen, emoji: "📚" },
            ] as const).map((opt) => {
              const sel = entryType === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setEntryType(opt.value)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold transition-all",
                    sel
                      ? "bg-accent text-accent-foreground shadow-[0_2px_10px_hsl(var(--accent)/0.3)]"
                      : "text-muted-foreground"
                  )}
                >
                  <span className="text-base leading-none">{opt.emoji}</span>
                  <span className="min-w-0 truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mood (trade only) */}
          {entryType === "trade" && <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
              How are you feeling? 💭
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={cn(
                    "flex min-w-0 flex-col items-center rounded-[10px] border-[1.5px] py-2.5 transition-colors",
                    mood === m.value
                      ? "border-accent bg-accent/[0.08]"
                      : "border-border bg-secondary"
                  )}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="mt-0.5 max-w-full truncate text-[9px] text-muted-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </div>}

          {/* Study-specific fields */}
          {entryType === "study" && (
            <>
              {/* Study type */}
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">What kind of study?</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {STUDY_TYPES.map((s) => {
                    const sel = studyType === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStudyType(sel ? "" : s.value)}
                        className={cn(
                          "flex min-w-0 flex-col items-center gap-0.5 rounded-[10px] border-[1.5px] py-2 transition-colors",
                          sel
                            ? "border-accent bg-accent/[0.08]"
                            : "border-border bg-secondary"
                        )}
                      >
                        <span className="text-base leading-none">{s.emoji}</span>
                        <span className={cn("max-w-full truncate text-center text-[9px] font-bold", sel ? "text-accent" : "text-muted-foreground")}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">⏱️ Time spent</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {STUDY_DURATIONS.map((d) => {
                    const sel = studyDuration === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setStudyDuration(sel ? "" : d)}
                        className={cn(
                          "flex-1 py-2 rounded-[10px] border-[1.5px] text-[12px] font-bold transition-colors",
                          sel
                            ? "bg-accent/[0.12] text-accent border-accent"
                            : "border-border bg-secondary text-muted-foreground"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confidence */}
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">How well do you get it?</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {STUDY_CONFIDENCE.map((c) => {
                    const sel = studyConfidence === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setStudyConfidence(sel ? 0 : c.value)}
                        className={cn(
                          "flex-1 flex flex-col items-center py-2 rounded-[10px] border-[1.5px] transition-colors",
                          sel
                            ? "border-accent bg-accent/[0.08]"
                            : "border-border bg-secondary"
                        )}
                      >
                        <span className="text-lg leading-none">{c.emoji}</span>
                        <span className={cn("mt-0.5 max-w-full truncate text-center text-[9px] font-bold", sel ? "text-accent" : "text-muted-foreground")}>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Key takeaway */}
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">💡 Biggest takeaway</p>
                <input
                  value={studyTakeaway}
                  onChange={(e) => setStudyTakeaway(e.target.value)}
                  placeholder="One thing you'll actually use…"
                  className="w-full min-w-0 rounded-[10px] border-[1.5px] border-border bg-secondary px-3.5 py-2.5 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent lg:text-sm"
                />
              </div>

              {/* Resource */}
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">🔗 Source / link (optional)</p>
                <input
                  value={studyResource}
                  onChange={(e) => setStudyResource(e.target.value)}
                  placeholder="Book title, video URL, course name…"
                  className="w-full min-w-0 rounded-[10px] border-[1.5px] border-border bg-secondary px-3.5 py-2.5 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent lg:text-sm"
                />
              </div>
            </>
          )}

          {/* Result */}
          {entryType === "trade" && <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Result</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {RESULTS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setResult(r.value)}
                  className={cn(
                    "min-w-0 rounded-[10px] border-[1.5px] py-2.5 text-[13px] font-bold transition-colors",
                    result === r.value
                      ? r.className === "win"
                        ? "bg-accent/[0.12] text-accent border-accent"
                        : r.className === "loss"
                        ? "bg-destructive/[0.12] text-destructive border-destructive"
                        : "bg-primary/[0.12] text-primary border-primary"
                      : "border-border bg-secondary text-muted-foreground"
                  )}
                >
                  {r.value}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className={cn(
                "flex min-w-0 flex-1 items-center overflow-hidden rounded-[10px] border-[1.5px] bg-secondary focus-within:border-accent",
                result === "Win" ? "border-accent" : result === "Loss" ? "border-destructive" : "border-border"
              )}>
                {result && (
                  <span className={cn(
                    "pl-3.5 pr-1 text-base font-black",
                    result === "Win" ? "text-accent" : result === "Loss" ? "text-destructive" : "text-primary"
                  )}>
                    {result === "Win" ? "+" : result === "Loss" ? "−" : ""}
                  </span>
                )}
                <input
                  type="text"
                  value={pnl}
                  onChange={(e) => setPnl(e.target.value.replace(/[+\-−]/g, ""))}
                  placeholder="e.g. 250"
                  className={cn(
                    "min-w-0 flex-1 bg-transparent py-2.5 text-[16px] text-foreground outline-none placeholder:text-muted-foreground lg:text-sm",
                    result ? "pl-0 pr-3.5" : "px-3.5"
                  )}
                />
              </div>
              <div className="flex items-center px-3 rounded-[10px] border-[1.5px] border-border bg-secondary text-[12px] font-bold text-muted-foreground">
                $
              </div>
            </div>
          </div>}

          {/* Market & Pair */}
          {entryType === "trade" && <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Market & Pair</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MARKETS.map((m) => {
                const sel = marketName === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMarketName(sel ? "" : m)}
                    className={cn(
                      "max-w-full rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-bold transition-colors",
                      sel
                        ? "bg-accent/[0.12] text-accent border-accent"
                        : "border-border bg-secondary text-muted-foreground"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <input
              value={pairName}
              onChange={(e) => setPairName(e.target.value)}
              placeholder="Pair (e.g. XAU/USD, NQ, BTC/USD)"
              className="w-full min-w-0 rounded-[10px] border-[1.5px] border-border bg-secondary px-3.5 py-2.5 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent lg:text-sm"
            />
            {recentPairs.length > 0 && (
              <div className="mt-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">⭐ Your most-used</p>
                <div className="flex max-w-full flex-wrap gap-1.5 overflow-hidden">
                  {recentPairs.map((p) => {
                    const sel = pairName === p;
                    return (
                      <button
                        key={`recent-${p}`}
                        type="button"
                        onClick={() => setPairName(sel ? "" : p)}
                        className={cn(
                          "max-w-full rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                          sel
                            ? "bg-accent/[0.12] text-accent border-accent"
                            : "border-accent/40 bg-accent/[0.04] text-foreground"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {marketName && PAIR_SUGGESTIONS[marketName] && (
              <div className="mt-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Suggestions</p>
                <div className="flex max-w-full flex-wrap gap-1.5 overflow-hidden">
                {PAIR_SUGGESTIONS[marketName].filter((p) => !recentPairs.includes(p)).map((p) => {
                  const sel = pairName === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPairName(sel ? "" : p)}
                      className={cn(
                        "max-w-full rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                        sel
                          ? "bg-accent/[0.12] text-accent border-accent"
                          : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                </div>
              </div>
            )}
          </div>}

          {/* Account Type */}
          {entryType === "trade" && <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Account Type</p>
            <div className="grid grid-cols-4 gap-2">
              {ACCOUNT_TYPES.map((a) => (
                <button
                  key={a}
                  onClick={() => setAccountType(a)}
                  className={cn(
                    "min-w-0 rounded-[10px] border-[1.5px] py-2.5 text-[13px] font-bold transition-colors",
                    accountType === a
                      ? "bg-accent/[0.12] text-accent border-accent"
                      : "border-border bg-secondary text-muted-foreground"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>}

          {/* Tags */}
          {entryType === "trade" && <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">What went right / wrong?</p>
             <div className="flex max-w-full flex-wrap gap-[5px] overflow-hidden">
              {ALL_TAGS.map((t) => {
                const sel = selectedTags.includes(t);
                const type = getTagType(t);
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedTags((prev) => sel ? prev.filter((x) => x !== t) : [...prev, t])}
                    className={cn(
                      "max-w-full rounded-full border-[1.5px] bg-transparent px-3 py-[5px] text-[11px] font-semibold transition-colors",
                      type === "green"
                        ? sel ? "border-accent text-accent" : "border-accent/50 text-foreground"
                        : type === "red"
                        ? sel ? "border-destructive text-destructive" : "border-destructive/50 text-foreground"
                        : sel ? "border-primary text-primary" : "border-primary/50 text-foreground"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>}

          {/* Notes */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
              {entryType === "study" ? "What did you study?" : "Notes"}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={entryType === "study"
                ? "Write freely about what you learned today…"
                : "What happened? What did you learn?"}
              className={cn(
                "w-full min-w-0 resize-none rounded-[10px] border-[1.5px] border-border bg-secondary px-3.5 py-2.5 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent lg:text-[13px]",
                entryType === "study" ? "min-h-[140px]" : "min-h-[60px]"
              )}
            />
          </div>

          {/* Share with */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Share this log with</p>
            <div className="flex flex-col gap-2">
              {[
                { value: "partners", icon: Link, label: "🤝 Partners", desc: "Your accepted partners can see this in their feed and on your profile" },
                { value: "private", icon: Lock, label: "🔒 Private", desc: "Only you can see this entry" },
              ].map((opt) => {
                const sel = shareSetting === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setShareSetting(opt.value)}
                    className={cn(
                      "flex min-w-0 items-start gap-3 rounded-[10px] border-[1.5px] p-3 text-left transition-colors",
                      sel
                        ? "border-accent bg-accent/[0.08]"
                        : "border-border bg-secondary"
                    )}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className={cn("text-[12px] font-bold", sel ? "text-accent" : "text-foreground")}>{opt.label}</span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground [overflow-wrap:anywhere]">{opt.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN LOG VIEW ───
  return (
    <AppLayout lockHeight>
      <AppHeader />

      {/* Page nav */}
      <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-3 overflow-hidden px-5 py-1.5">
        <h1 className="min-w-0 truncate text-lg font-black text-foreground" style={{ fontFamily: "'Gabarito', sans-serif" }}>Trading Log</h1>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowRangeMenu((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
            >
              {statsRange === "daily" ? "Today" : statsRange === "monthly" ? "This Month" : "This Week"}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showRangeMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowRangeMenu(false)} />
                <div className="absolute right-0 top-6 z-40 min-w-[120px] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                  {([
                    { v: "daily", label: "Daily" },
                    { v: "weekly", label: "Weekly" },
                    { v: "monthly", label: "Monthly" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => { setStatsRange(opt.v); setShowRangeMenu(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[12px] font-semibold hover:bg-secondary",
                        statsRange === opt.v ? "text-accent" : "text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            aria-label="Log new entry"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_2px_10px_hsl(var(--accent)/0.35)]"
          >
            <Plus className="w-4 h-4 text-accent-foreground" strokeWidth={2.8} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-16" style={{ scrollbarWidth: "none" }}>
        {/* Streak */}
        <div className="flex items-center gap-2.5 mx-5 my-2 p-2.5 px-3.5 bg-card border border-border rounded-xl">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <div className="text-xl font-black text-foreground" style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {streak} Day Streak
            </div>
            <div className="text-[10px] text-muted-foreground">
              {streak > 0 ? "Keep it going - log today's session" : "Start your streak - log today's session"}
            </div>
          </div>
          <div className="flex gap-[3px]">
            {weekDots.map((dot, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full",
                  dot.logged
                    ? "bg-accent"
                    : dot.isToday
                    ? "bg-accent shadow-[0_0_6px_hsl(var(--accent))]"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-px bg-border rounded-[10px] overflow-hidden mx-5 mb-3">
          <div className="bg-card py-2.5 px-1 text-center">
            <div className={cn("text-sm font-black leading-tight", (stats.totalDollars || stats.totalPips) >= 0 ? "text-accent" : "text-destructive")} style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {stats.totalDollars !== 0
                ? `${stats.totalDollars > 0 ? "+$" : "-$"}${Math.abs(stats.totalDollars)}`
                : `${stats.totalPips > 0 ? "+" : ""}${stats.totalPips}p`}
            </div>
            {stats.totalDollars !== 0 && stats.totalPips !== 0 && (
              <div className={cn("text-[9px] font-bold leading-none", stats.totalPips >= 0 ? "text-accent" : "text-destructive")}>
                {stats.totalPips > 0 ? "+" : ""}{stats.totalPips}p
              </div>
            )}
            <div className="text-[9px] text-muted-foreground mt-0.5">P&L</div>
          </div>
          <div className="bg-card py-2.5 px-1 text-center">
            <div className="text-sm font-black text-foreground leading-tight" style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {stats.totalTrades}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">Trades</div>
          </div>
          <div className="bg-card py-2.5 px-1 text-center">
            <div className={cn("text-sm font-black leading-tight", stats.winRate > 50 ? "text-accent" : "text-foreground")} style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {stats.winRate}%
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">Win Rate</div>
          </div>
          <div className="bg-card py-2.5 px-1 text-center">
            <div className="text-sm font-black text-primary leading-tight" style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {stats.studyMins >= 60 ? `${(stats.studyMins / 60).toFixed(stats.studyMins % 60 === 0 ? 0 : 1)}h` : `${stats.studyMins}m`}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">Studied</div>
          </div>
        </div>

        {/* Trade / Study view toggle */}
        <div className="mx-5 mb-2 flex gap-1.5 p-1 rounded-2xl bg-secondary border border-border">
          {([
            { value: "trade", label: "Trade Log", emoji: "📈" },
            { value: "study", label: "Study Log", emoji: "📚" },
          ] as const).map((opt) => {
            const sel = logView === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setLogView(opt.value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold transition-all",
                  sel
                    ? opt.value === "study"
                      ? "bg-primary text-primary-foreground shadow-[0_2px_10px_hsl(var(--primary)/0.3)]"
                      : "bg-accent text-accent-foreground shadow-[0_2px_10px_hsl(var(--accent)/0.3)]"
                    : "text-muted-foreground"
                )}
              >
                <span className="text-base leading-none">{opt.emoji}</span>
                <span className="min-w-0 truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section header */}
        <div className="px-5 pt-1 pb-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Recent {logView === "study" ? "Study Sessions" : "Trades"}
          </span>
        </div>

        {/* Entries */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (() => {
          const filteredEntries = entries.filter((e) =>
            logView === "study" ? e.entry_type === "study" : (e.entry_type || "trade") === "trade"
          );
          return filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <div className="text-3xl mb-3">📓</div>
            <h2 className="text-base font-bold text-foreground mb-1">
              No {logView === "study" ? "study sessions" : "trades"} logged yet
            </h2>
            <p className="text-xs text-muted-foreground">
              Tap + to log your first {logView === "study" ? "study session" : "trade"}
            </p>
          </div>
        ) : (
          <>
            <div className="mx-5 max-w-full space-y-1.5 overflow-hidden">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className={cn(
                    "relative max-w-full cursor-pointer overflow-hidden rounded-xl border bg-card p-2.5 px-3 transition-colors hover:bg-card/80",
                    entry.entry_type === "study" ? "border-primary/40" : "border-border",
                    expandedId === entry.id && "ring-1 ring-accent/40"
                  )}
                >
                  <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-0.5",
                        entry.entry_type === "study"
                          ? "bg-primary/15 text-primary"
                          : "bg-accent/15 text-accent"
                      )}>
                        {entry.entry_type === "study" ? "📚 Study" : "📈 Trade"}
                      </span>
                      <span className="min-w-0 truncate text-[11px] font-bold text-foreground">{formatEntryDate(entry.created_at)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {entry.entry_type !== "study" && entry.pnl_pips != null && (
                        <span className={cn("text-sm font-extrabold", (entry.pnl_pips || 0) >= 0 ? "text-accent" : "text-destructive")} style={{ fontFamily: "'Gabarito', sans-serif" }}>
                          {entry.pnl_unit === "dollars"
                            ? `${(entry.pnl_pips || 0) >= 0 ? "+$" : "-$"}${Math.abs(entry.pnl_pips ?? 0)}`
                            : `${(entry.pnl_pips || 0) > 0 ? "+" : ""}${entry.pnl_pips ?? 0} pips`}
                        </span>
                      )}
                      {entry.entry_type === "study" && entry.study_data?.duration && (
                        <span className="text-sm font-extrabold text-primary" style={{ fontFamily: "'Gabarito', sans-serif" }}>
                          ⏱️ {entry.study_data.duration}
                        </span>
                      )}
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedId === entry.id && "rotate-180")} />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === entry.id ? null : entry.id); }}
                        className="w-6 h-6 -mr-1 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                        aria-label="Entry options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {openMenuId === entry.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                      <div className="absolute right-2 top-9 z-40 min-w-[130px] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-secondary"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                  {/* Compact summary row when collapsed */}
                  {expandedId !== entry.id && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {entry.entry_type === "study"
                        ? (entry.notes || entry.study_data?.takeaway || "Study session")
                        : [entry.market_pair, entry.mood ? getMoodText(entry.mood) : null].filter(Boolean).join(" · ") || "Trade entry"}
                    </div>
                  )}
                  {/* Full detail when expanded */}
                  {expandedId === entry.id && <>
                  {entry.mood && entry.entry_type !== "study" && (
                    <div className="flex items-center gap-1 mb-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", getMoodDotColor(entry.mood))} />
                      <span className="text-[10px] text-muted-foreground">{getMoodText(entry.mood)}</span>
                    </div>
                  )}
                  {entry.entry_type === "study" && entry.study_data && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {entry.study_data.study_type && (() => {
                        const st = STUDY_TYPES.find((s) => s.value === entry.study_data.study_type);
                        return st ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                            {st.emoji} {st.label}
                          </span>
                        ) : null;
                      })()}
                      {entry.study_data.confidence && (() => {
                        const c = STUDY_CONFIDENCE.find((x) => x.value === entry.study_data.confidence);
                        return c ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-accent/15 text-accent">
                            {c.emoji} {c.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  )}
                  {entry.entry_type === "study" && entry.study_data?.takeaway && (
                    <p className="mb-1 text-[11px] italic leading-snug text-foreground [overflow-wrap:anywhere]">"{entry.study_data.takeaway}"</p>
                  )}
                  {entry.notes && (
                    <p className="mb-1 whitespace-pre-wrap text-[11px] leading-snug text-foreground [overflow-wrap:anywhere]">{entry.notes}</p>
                  )}
                  {entry.entry_type === "study" && entry.study_data?.topics?.length > 0 && (
                    <div className="flex flex-wrap gap-[3px] mb-1">
                      {entry.study_data.topics.map((t: string) => (
                        <span key={t} className="text-[8px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-primary/10 text-primary">{t}</span>
                      ))}
                    </div>
                  )}
                  {entry.entry_type === "study" && entry.study_data?.resource && (
                    <div className="mt-0.5 truncate text-[9px] text-muted-foreground">🔗 {entry.study_data.resource}</div>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-[3px] mb-1">
                      {entry.tags.map((tag) => {
                        const type = getTagType(tag);
                        return (
                          <span key={tag} className={cn(
                            "text-[8px] font-semibold px-1.5 py-0.5 rounded-[3px]",
                            type === "green" && "bg-accent/10 text-accent",
                            type === "red" && "bg-destructive/10 text-destructive",
                            type === "neutral" && "bg-primary/10 text-primary"
                          )}>{tag}</span>
                        );
                      })}
                    </div>
                  )}
                  {(entry.market_pair || entry.session) && (
                    <div className="mt-0.5 text-[9px] text-muted-foreground [overflow-wrap:anywhere]">
                      {[entry.market_pair, entry.session ? `${entry.session} session` : null].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {entry.account_type && (
                    <div className="mt-0.5 text-[9px] text-muted-foreground [overflow-wrap:anywhere]">Account: {entry.account_type}</div>
                  )}
                  </>}
                </div>
              ))}
            </div>

            {/* Shared with partner card */}
            {filteredEntries[0]?.share_setting === "partners" && (
              partners.length > 0 ? (
                <div className="mx-5 mt-3 overflow-hidden rounded-xl border-[1.5px] border-accent/40 bg-accent/[0.05] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1.5">
                    SHARED WITH {partners[0].name.split(" ")[0].toUpperCase()}
                    {partners.length > 1 && ` + ${partners.length - 1} other${partners.length > 2 ? "s" : ""}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Your partner can see your P&L, what you did right, what went wrong, and how you felt.
                  </p>
                </div>
              ) : (
                <div className="mx-5 mt-3 overflow-hidden rounded-xl border-[1.5px] border-primary/30 bg-primary/[0.05] p-3.5">
                  <p className="text-[11px] text-muted-foreground mb-2">Connect with a partner to share your sessions</p>
                  <button
                    onClick={() => navigate("/discover")}
                    className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-[11px] font-bold shadow-[0_2px_10px_hsl(var(--accent)/0.35)]"
                  >
                    Find a partner
                  </button>
                </div>
              )
            )}
          </>
        );
        })()}
      </div>

      
    </AppLayout>
  );
}
