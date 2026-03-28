import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

interface MatchCandidate {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  markets: string[];
  trading_style: string[];
  experience_level: string | null;
  sessions: string[];
  strategies: string[];
  matchPct: number;
  whyMatch: string;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  "Just getting started": "Beginner",
  "Building my edge": "Intermediate",
  "Consistent & growing": "Advanced",
  "Profitable trader": "Pro",
};

function computeMatch(
  myTrading: any,
  theirTrading: any
): { pct: number; reasons: string[] } {
  if (!myTrading || !theirTrading) return { pct: 0, reasons: [] };
  const reasons: string[] = [];
  let score = 0;
  let total = 0;

  const overlap = (a: string[], b: string[]) =>
    a.filter((v) => b.includes(v));

  // Markets (weight 3)
  total += 3;
  const mOverlap = overlap(myTrading.markets || [], theirTrading.markets || []);
  if (mOverlap.length > 0) {
    score += 3 * (mOverlap.length / Math.max((myTrading.markets || []).length, 1));
    reasons.push(`Both trade ${mOverlap.slice(0, 2).join(", ")}`);
  }

  // Style (weight 2)
  total += 2;
  const sOverlap = overlap(myTrading.trading_style || [], theirTrading.trading_style || []);
  if (sOverlap.length > 0) {
    score += 2;
    reasons.push(`${sOverlap[0]} style`);
  }

  // Sessions (weight 2)
  total += 2;
  const sessOverlap = overlap(myTrading.sessions || [], theirTrading.sessions || []);
  if (sessOverlap.length > 0) {
    score += 2;
  }

  // Experience (weight 1)
  total += 1;
  if (myTrading.experience_level && myTrading.experience_level === theirTrading.experience_level) {
    score += 1;
    reasons.push("Same experience level");
  }

  // Strategies (weight 2)
  total += 2;
  const stratOverlap = overlap(myTrading.strategies || [], theirTrading.strategies || []);
  if (stratOverlap.length > 0) {
    score += 2 * (stratOverlap.length / Math.max((myTrading.strategies || []).length, 1));
  }

  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  return { pct, reasons };
}

const FILTER_OPTIONS = {
  market: ["Forex", "Futures", "Options"],
  session: ["London", "New York", "Asian"],
  experience: ["Just getting started", "Building my edge", "Consistent & growing", "Profitable trader"],
};

const Discover = () => {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ market: string | null; session: string | null; experience: string | null }>({
    market: null,
    session: null,
    experience: null,
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get my trading profile
      const { data: myTrading } = await supabase
        .from("trading_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Get all other users with their profiles and trading data
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .eq("onboarding_completed", true);

      if (!allProfiles || allProfiles.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = allProfiles.map((p) => p.id);
      const { data: allTrading } = await supabase
        .from("trading_profiles")
        .select("*")
        .in("user_id", userIds);

      const tradingMap = new Map<string, any>();
      (allTrading || []).forEach((t) => tradingMap.set(t.user_id, t));

      const candidates: MatchCandidate[] = allProfiles
        .map((p) => {
          const t = tradingMap.get(p.id);
          const { pct, reasons } = computeMatch(myTrading, t);
          return {
            id: p.id,
            username: p.username,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            location: p.location,
            markets: t?.markets || [],
            trading_style: t?.trading_style || [],
            experience_level: t?.experience_level || null,
            sessions: t?.sessions || [],
            strategies: t?.strategies || [],
            matchPct: pct,
            whyMatch: reasons.slice(0, 2).join(" · "),
          };
        })
        .sort((a, b) => b.matchPct - a.matchPct);

      setMatches(candidates);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = matches;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          (m.full_name || "").toLowerCase().includes(q) ||
          (m.username || "").toLowerCase().includes(q) ||
          m.markets.some((mk) => mk.toLowerCase().includes(q))
      );
    }
    if (filters.market) result = result.filter((m) => m.markets.includes(filters.market!));
    if (filters.session) result = result.filter((m) => m.sessions.includes(filters.session!));
    if (filters.experience) result = result.filter((m) => m.experience_level === filters.experience);
    return result;
  }, [matches, searchQuery, filters]);

  const activeFilterCount = [filters.market, filters.session, filters.experience].filter(Boolean).length;

  const getInitials = (name: string | null, username: string | null) => {
    const display = name || username || "?";
    return display.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-[22px] font-black text-foreground tracking-tight">Discover</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Find your accountability partner</p>
      </div>

      {/* Search + Filter */}
      <div className="px-5 pb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or market..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground text-[13px]"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center relative"
        >
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="px-5 pb-3 space-y-2">
          {(["market", "session", "experience"] as const).map((key) => (
            <div key={key}>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                {key === "market" ? "Market" : key === "session" ? "Session" : "Experience"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILTER_OPTIONS[key].map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setFilters((f) => ({ ...f, [key]: f[key] === opt ? null : opt }))
                    }
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                      filters[key] === opt
                        ? "bg-gradient-to-r from-primary to-success border-transparent text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-success"
                    }`}
                  >
                    {key === "experience" ? EXPERIENCE_LABELS[opt] || opt : opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({ market: null, session: null, experience: null })}
              className="text-[11px] text-destructive font-semibold flex items-center gap-1 mt-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-14 h-14 rounded-full bg-secondary border border-border flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-[15px] font-bold text-foreground mb-1">No partner matches yet</h3>
            <p className="text-[12px] text-muted-foreground max-w-[240px] mb-4">
              We're still finding the best trading partners for you.
            </p>
            <button
              onClick={() => navigate("/onboarding")}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-success text-[13px] font-bold text-primary-foreground"
            >
              Update onboarding
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 pb-4">
            <div className="text-[11px] text-muted-foreground font-semibold mb-1">
              {filtered.length} {filtered.length === 1 ? "match" : "matches"}
            </div>
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/view-profile?id=${m.id}`)}
                className="w-full bg-card border border-border rounded-xl p-3.5 flex items-start gap-3 text-left hover:border-success/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-success/30 border border-border flex items-center justify-center shrink-0">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-foreground">{getInitials(m.full_name, m.username)}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-bold text-foreground truncate">
                        {m.full_name || m.username || "Trader"}
                      </div>
                      {m.username && (
                        <div className="text-[11px] text-muted-foreground">@{m.username}</div>
                      )}
                    </div>
                    <div className="shrink-0 ml-2 px-2.5 py-1 rounded-lg bg-success/10 border border-success/20">
                      <span className="text-[13px] font-black text-success">{m.matchPct}%</span>
                    </div>
                  </div>

                  {m.location && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {m.location}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.markets.slice(0, 3).map((mk) => (
                      <span key={mk} className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                        {mk}
                      </span>
                    ))}
                    {m.trading_style.slice(0, 2).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-accent/10 text-[9px] font-semibold text-accent-foreground">
                        {s}
                      </span>
                    ))}
                    {m.experience_level && (
                      <span className="px-2 py-0.5 rounded-full bg-success/10 text-[9px] font-semibold text-success">
                        {EXPERIENCE_LABELS[m.experience_level] || m.experience_level}
                      </span>
                    )}
                  </div>

                  {/* Why match */}
                  {m.whyMatch && (
                    <div className="text-[10px] text-muted-foreground mt-1.5 italic">
                      {m.whyMatch}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      
    </AppLayout>
  );
};

export default Discover;
