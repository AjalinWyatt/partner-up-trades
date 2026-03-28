import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Zap, TrendingUp, BarChart3, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import LogoHeader from "@/components/LogoHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
}

const MOODS = [
  { value: "rough", emoji: "😫", label: "Rough" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "great", emoji: "😄", label: "Great" },
];

const RESULTS = ["Win", "Loss", "Break Even"];
const SESSIONS = ["London", "New York", "Asian"];
const TAGS = [
  { label: "Followed plan", type: "good" },
  { label: "Clean entry", type: "good" },
  { label: "Held to TP", type: "good" },
  { label: "FOMO entry", type: "bad" },
  { label: "Moved stop", type: "bad" },
  { label: "Revenge trade", type: "bad" },
  { label: "Cut early", type: "neutral" },
  { label: "Sized up", type: "neutral" },
  { label: "Took partials", type: "neutral" },
];

const SHARE_OPTIONS = ["Private", "Partners", "Groups"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function getTagColor(type: string) {
  if (type === "good") return "bg-accent/20 text-accent";
  if (type === "bad") return "bg-destructive/20 text-destructive";
  return "bg-[hsl(38,92%,55%)]/20 text-[hsl(38,92%,55%)]";
}

function getMoodEmoji(mood: string | null) {
  return MOODS.find((m) => m.value === mood)?.emoji || "😐";
}

function getMoodLabel(mood: string | null) {
  return MOODS.find((m) => m.value === mood)?.label || mood;
}

export default function TradingLog() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [period, setPeriod] = useState("This Week");

  // Form state
  const [mood, setMood] = useState("");
  const [result, setResult] = useState("");
  const [pnl, setPnl] = useState("");
  const [marketPair, setMarketPair] = useState("");
  const [session, setSession] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [share, setShare] = useState("Private");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/signin");
        return;
      }
      setUserId(data.user.id);
    });
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    loadEntries();
  }, [userId]);

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

  // Streak calculation
  function getStreak() {
    if (entries.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      const hasEntry = entries.some(
        (e) => new Date(e.created_at).toISOString().split("T")[0] === dayStr
      );
      if (hasEntry) streak++;
      else if (i > 0) break;
    }
    return streak;
  }

  // Weekly dots
  function getWeekDots() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const dots = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const dayStr = day.toISOString().split("T")[0];
      const todayStr = today.toISOString().split("T")[0];
      const logged = entries.some(
        (e) => new Date(e.created_at).toISOString().split("T")[0] === dayStr
      );
      dots.push({ logged, isToday: dayStr === todayStr });
    }
    return dots;
  }

  // Stats
  function getWeekStats() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekEntries = entries.filter(
      (e) => new Date(e.created_at) >= startOfWeek
    );

    const totalPips = weekEntries.reduce((sum, e) => sum + (e.pnl_pips || 0), 0);
    const totalTrades = weekEntries.length;
    const wins = weekEntries.filter((e) => e.result === "Win").length;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

    return { totalPips, totalTrades, winRate };
  }

  async function saveEntry() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("journal_entries").insert({
      user_id: userId,
      mood: mood || null,
      result: result || null,
      pnl_pips: pnl ? parseFloat(pnl) : null,
      market_pair: marketPair || null,
      session: session || null,
      tags,
      notes: notes || null,
      share_setting: share.toLowerCase(),
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save entry");
      return;
    }
    toast.success("Session logged!");
    setShowForm(false);
    resetForm();
    loadEntries();
  }

  function resetForm() {
    setMood("");
    setResult("");
    setPnl("");
    setMarketPair("");
    setSession("");
    setTags([]);
    setNotes("");
    setShare("Private");
  }

  const streak = getStreak();
  const weekDots = getWeekDots();
  const stats = getWeekStats();

  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      <LogoHeader />
      <div className="px-4 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Trading Log</h1>
          <button className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
            {period} ▾
          </button>
        </div>

        {/* Streak card */}
        <div className="bg-card rounded-2xl p-4 mb-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-[hsl(38,92%,55%)]" />
            <span className="text-lg font-bold text-foreground">{streak} Day Streak</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {streak > 0 ? "Keep it going — log today's session" : "Start your streak — log today's session"}
          </p>
          <div className="flex items-center gap-2">
            {weekDots.map((dot, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-full",
                  dot.logged
                    ? "bg-accent"
                    : dot.isToday
                    ? "bg-primary animate-pulse"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <TrendingUp className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className={cn("text-lg font-bold", stats.totalPips >= 0 ? "text-accent" : "text-destructive")}>
              {stats.totalPips > 0 ? "+" : ""}{stats.totalPips}
            </p>
            <p className="text-[10px] text-muted-foreground">Pips</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <BarChart3 className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.totalTrades}</p>
            <p className="text-[10px] text-muted-foreground">Trades</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <Target className="w-4 h-4 text-[hsl(38,92%,55%)] mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.winRate}%</p>
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
          </div>
        </div>

        {/* Recent sessions */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent Sessions</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <BarChart3 className="w-14 h-14 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">No sessions logged yet</h2>
          <p className="text-sm text-muted-foreground">
            Tap + to log your first session
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{getMoodEmoji(entry.mood)}</span>
                  <span className="text-xs text-muted-foreground">{getMoodLabel(entry.mood)}</span>
                </div>
                <span className={cn("text-sm font-bold", (entry.pnl_pips || 0) >= 0 ? "text-accent" : "text-destructive")}>
                  {(entry.pnl_pips || 0) > 0 ? "+" : ""}{entry.pnl_pips ?? 0} pips
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>{formatDate(entry.created_at)}</span>
                <span>·</span>
                <span>{formatTime(entry.created_at)}</span>
                {entry.market_pair && (
                  <>
                    <span>·</span>
                    <span>{entry.market_pair}</span>
                  </>
                )}
                {entry.session && (
                  <>
                    <span>·</span>
                    <span>{entry.session}</span>
                  </>
                )}
              </div>
              {entry.notes && (
                <p className="text-xs text-muted-foreground mb-2">{entry.notes}</p>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => {
                    const tagDef = TAGS.find((t) => t.label === tag);
                    return (
                      <span key={tag} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", getTagColor(tagDef?.type || "neutral"))}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 z-40"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </button>

      {/* Log Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-background border-border max-h-[90vh] overflow-y-auto p-0 gap-0 max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button onClick={() => setShowForm(false)}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-base font-semibold text-foreground">Log Session</h2>
            <button
              onClick={saveEntry}
              disabled={saving}
              className="text-sm font-semibold text-primary disabled:opacity-50"
            >
              Save
            </button>
          </div>

          <div className="px-4 py-4 space-y-5">
            {/* Mood */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">How are you feeling?</p>
              <div className="flex gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors",
                      mood === m.value ? "border-primary bg-primary/10" : "border-border bg-card"
                    )}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Result */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Result</p>
              <div className="flex gap-2">
                {RESULTS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setResult(r)}
                    className={cn(
                      "flex-1 py-2 rounded-full text-xs font-medium border transition-colors",
                      result === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* P&L */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">P&L (pips)</p>
              <Input
                type="number"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                placeholder="e.g. +45"
                className="bg-card border-border text-foreground"
              />
            </div>

            {/* Market & Pair */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Market & Pair</p>
              <Input
                value={marketPair}
                onChange={(e) => setMarketPair(e.target.value)}
                placeholder="e.g. Gold · XAU/USD"
                className="bg-card border-border text-foreground"
              />
            </div>

            {/* Session */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Session</p>
              <div className="flex gap-2">
                {SESSIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSession(s)}
                    className={cn(
                      "flex-1 py-2 rounded-full text-xs font-medium border transition-colors",
                      session === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t) => {
                  const selected = tags.includes(t.label);
                  return (
                    <button
                      key={t.label}
                      onClick={() =>
                        setTags((prev) =>
                          selected ? prev.filter((x) => x !== t.label) : [...prev, t.label]
                        )
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        selected ? getTagColor(t.type) + " border-transparent" : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Notes</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened in this session..."
                className="bg-card border-border text-foreground min-h-[80px]"
              />
            </div>

            {/* Share with */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Share with</p>
              <div className="flex gap-2">
                {SHARE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setShare(s)}
                    className={cn(
                      "flex-1 py-2 rounded-full text-xs font-medium border transition-colors",
                      share === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
