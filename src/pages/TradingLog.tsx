import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Lock, Link } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import LogoHeader from "@/components/LogoHeader";
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

  // Form state
  const [mood, setMood] = useState("");
  const [result, setResult] = useState("");
  const [pnl, setPnl] = useState("");
  const [pnlUnit, setPnlUnit] = useState<"pips" | "dollars">("pips");
  const [marketName, setMarketName] = useState("");
  const [pairName, setPairName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [shareSetting, setShareSetting] = useState("partners");
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);

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
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
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
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekEntries = entries.filter((e) => new Date(e.created_at) >= startOfWeek);
    const pipsEntries = weekEntries.filter((e) => (e.pnl_unit || "pips") === "pips");
    const dollarEntries = weekEntries.filter((e) => e.pnl_unit === "dollars");
    const totalPips = pipsEntries.reduce((sum, e) => sum + (e.pnl_pips || 0), 0);
    const totalDollars = dollarEntries.reduce((sum, e) => sum + (e.pnl_pips || 0), 0);
    const totalTrades = weekEntries.length;
    const wins = weekEntries.filter((e) => e.result === "Win").length;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    return { totalPips, totalDollars, totalTrades, winRate };
  }

  async function saveEntry() {
    if (!userId) return;
    setSaving(true);
    const marketPairStr = [marketName, pairName].filter(Boolean).join(" · ");
    const { error } = await supabase.from("journal_entries").insert({
      user_id: userId,
      mood: mood || null,
      result: result || null,
      pnl_pips: pnl ? parseFloat(pnl) : null,
      pnl_unit: pnlUnit,
      market_pair: marketPairStr || null,
      session: null,
      tags: selectedTags,
      notes: notes || null,
      share_setting: shareSetting,
      account_type: accountType || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Failed to save entry"); return; }
    toast.success("Session logged!");
    setShowForm(false);
    resetForm();
    loadEntries();

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
    setPnlUnit("pips");
  }

  const streak = getStreak();
  const weekDots = getWeekDots();
  const stats = getWeekStats();

  // ─── FORM VIEW ───
  if (showForm) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Form header */}
        <div className="flex items-center justify-between px-5 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center">
              <X className="w-[22px] h-[22px] text-foreground" strokeWidth={2} />
            </button>
            <span className="text-base font-extrabold text-foreground" style={{ fontFamily: "'Gabarito', sans-serif" }}>Log Session</span>
          </div>
          <button
            onClick={saveEntry}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-[13px] font-bold disabled:opacity-50"
          >
            Save
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3.5" style={{ scrollbarWidth: "none" }}>
          {/* Mood */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">How are you feeling?</p>
            <div className="flex gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center py-2.5 rounded-[10px] border-[1.5px] transition-colors",
                    mood === m.value
                      ? "border-accent bg-accent/[0.08]"
                      : "border-border bg-secondary"
                  )}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Result</p>
            <div className="flex gap-2 mb-2">
              {RESULTS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setResult(r.value)}
                  className={cn(
                    "flex-1 py-2.5 rounded-[10px] border-[1.5px] text-[13px] font-bold transition-colors",
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
            <div className="flex gap-2">
              <input
                type="text"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                placeholder={pnlUnit === "pips" ? "e.g. +38" : "e.g. +250"}
                className="flex-1 py-2.5 px-3.5 rounded-[10px] border-[1.5px] border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent"
              />
              <div className="flex rounded-[10px] border-[1.5px] border-border bg-secondary p-0.5">
                {(["pips", "dollars"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setPnlUnit(u)}
                    className={cn(
                      "px-3 rounded-[8px] text-[12px] font-bold transition-colors",
                      pnlUnit === u ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                  >
                    {u === "pips" ? "Pips" : "$"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Market & Pair */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Market & Pair</p>
            <div className="flex gap-2">
              <input
                value={marketName}
                onChange={(e) => setMarketName(e.target.value)}
                placeholder="e.g. Forex"
                className="flex-1 py-2.5 px-3.5 rounded-[10px] border-[1.5px] border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent"
              />
              <input
                value={pairName}
                onChange={(e) => setPairName(e.target.value)}
                placeholder="e.g. XAU/USD"
                className="flex-1 py-2.5 px-3.5 rounded-[10px] border-[1.5px] border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Account Type */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Account Type</p>
            <div className="flex gap-2">
              {ACCOUNT_TYPES.map((a) => (
                <button
                  key={a}
                  onClick={() => setAccountType(a)}
                  className={cn(
                    "flex-1 py-2.5 rounded-[10px] border-[1.5px] text-[13px] font-bold transition-colors",
                    accountType === a
                      ? "bg-accent/[0.12] text-accent border-accent"
                      : "border-border bg-secondary text-muted-foreground"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">What went right / wrong?</p>
             <div className="flex flex-wrap gap-[5px]">
              {ALL_TAGS.map((t) => {
                const sel = selectedTags.includes(t);
                const type = getTagType(t);
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedTags((prev) => sel ? prev.filter((x) => x !== t) : [...prev, t])}
                    className={cn(
                      "px-3 py-[5px] rounded-full text-[11px] font-semibold transition-colors bg-transparent border-[1.5px]",
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
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? What did you learn?"
              className="w-full min-h-[60px] py-2.5 px-3.5 rounded-[10px] border-[1.5px] border-border bg-secondary text-[13px] text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-accent"
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
                      "flex items-start gap-3 p-3 rounded-[10px] border-[1.5px] transition-colors text-left",
                      sel
                        ? "border-accent bg-accent/[0.08]"
                        : "border-border bg-secondary"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className={cn("text-[12px] font-bold", sel ? "text-accent" : "text-foreground")}>{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</span>
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
    <AppLayout>
      <LogoHeader />

      {/* Page nav */}
      <div className="flex items-center justify-between px-5 py-1.5">
        <h1 className="text-lg font-black text-foreground" style={{ fontFamily: "'Gabarito', sans-serif" }}>Trading Log</h1>
        <button className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          This Week
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
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
        <div className="grid grid-cols-3 gap-px bg-border rounded-[10px] overflow-hidden mx-5 mb-3">
          <div className="bg-card py-2.5 px-2 text-center">
            <div className={cn("text-base font-black", stats.totalPips >= 0 ? "text-accent" : "text-destructive")} style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {stats.totalPips > 0 ? "+" : ""}{stats.totalPips}{stats.totalDollars !== 0 ? "p" : " pips"}
            </div>
            {stats.totalDollars !== 0 && (
              <div className={cn("text-[10px] font-bold", stats.totalDollars >= 0 ? "text-accent" : "text-destructive")}>
                {stats.totalDollars > 0 ? "+$" : "-$"}{Math.abs(stats.totalDollars)}
              </div>
            )}
            <div className="text-[9px] text-muted-foreground mt-px">This Week</div>
          </div>
          <div className="bg-card py-2.5 px-2 text-center">
            <div className="text-base font-black text-foreground" style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {stats.totalTrades}
            </div>
            <div className="text-[9px] text-muted-foreground mt-px">Trades</div>
          </div>
          <div className="bg-card py-2.5 px-2 text-center">
            <div className={cn("text-base font-black", stats.winRate > 50 ? "text-accent" : "text-foreground")} style={{ fontFamily: "'Gabarito', sans-serif" }}>
              {stats.winRate}%
            </div>
            <div className="text-[9px] text-muted-foreground mt-px">Win Rate</div>
          </div>
        </div>

        {/* Section header */}
        <div className="px-5 pt-2.5 pb-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Recent Sessions</span>
        </div>

        {/* Entries */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <div className="text-3xl mb-3">📓</div>
            <h2 className="text-base font-bold text-foreground mb-1">No sessions logged yet</h2>
            <p className="text-xs text-muted-foreground">
              Tap + to log your first session
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5 mx-5">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-card border border-border rounded-xl p-2.5 px-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-foreground">{formatEntryDate(entry.created_at)}</span>
                    <span className={cn("text-sm font-extrabold", (entry.pnl_pips || 0) >= 0 ? "text-accent" : "text-destructive")} style={{ fontFamily: "'Gabarito', sans-serif" }}>
                      {entry.pnl_unit === "dollars"
                        ? `${(entry.pnl_pips || 0) >= 0 ? "+$" : "-$"}${Math.abs(entry.pnl_pips ?? 0)}`
                        : `${(entry.pnl_pips || 0) > 0 ? "+" : ""}${entry.pnl_pips ?? 0} pips`}
                    </span>
                  </div>
                  {entry.mood && (
                    <div className="flex items-center gap-1 mb-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", getMoodDotColor(entry.mood))} />
                      <span className="text-[10px] text-muted-foreground">{getMoodText(entry.mood)}</span>
                    </div>
                  )}
                  {entry.notes && (
                    <p className="text-[11px] text-muted-foreground leading-snug mb-1">{entry.notes}</p>
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
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {[entry.market_pair, entry.session ? `${entry.session} session` : null].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Shared with partner card */}
            {entries[0]?.share_setting === "partners" && (
              partners.length > 0 ? (
                <div className="mx-5 mt-3 p-3.5 rounded-xl border-[1.5px] border-accent/40 bg-accent/[0.05]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1.5">
                    SHARED WITH {partners[0].name.split(" ")[0].toUpperCase()}
                    {partners.length > 1 && ` + ${partners.length - 1} other${partners.length > 2 ? "s" : ""}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Your partner can see your P&L, what you did right, what went wrong, and how you felt.
                  </p>
                </div>
              ) : (
                <div className="mx-5 mt-3 p-3.5 rounded-xl border-[1.5px] border-primary/30 bg-primary/[0.05]">
                  <p className="text-[11px] text-muted-foreground mb-2">Connect with a partner to share your sessions</p>
                  <button
                    onClick={() => navigate("/discover")}
                    className="px-4 py-2 rounded-lg bg-gradient-brand text-white text-[11px] font-bold"
                  >
                    Find a partner
                  </button>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-[68px] right-5 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center z-40"
        style={{ boxShadow: "0 4px 20px rgba(18,184,122,0.3)" }}
      >
        <Plus className="w-6 h-6 text-foreground" strokeWidth={2.5} />
      </button>

      
    </AppLayout>
  );
}
