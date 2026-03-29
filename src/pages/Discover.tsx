import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { computeMatch } from "@/lib/matchUtils";

interface MatchCandidate {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
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

      // Bug 1 fix: Get ALL partner_connections for this user (any status)
      const { data: allConnections } = await supabase
        .from("partner_connections")
        .select("requester_id, receiver_id")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      // Build a set of all user IDs this user has interacted with
      const excludedIds = new Set<string>();
      excludedIds.add(user.id); // exclude self
      (allConnections || []).forEach((c: any) => {
        excludedIds.add(c.requester_id);
        excludedIds.add(c.receiver_id);
      });

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

      // Filter out excluded IDs
      const eligibleProfiles = allProfiles.filter((p: any) => !excludedIds.has(p.id));

      if (eligibleProfiles.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const userIds = eligibleProfiles.map((p: any) => p.id);
      const { data: allTrading } = await supabase
        .from("trading_profiles")
        .select("*")
        .in("user_id", userIds);

      const tradingMap = new Map<string, any>();
      (allTrading || []).forEach((t: any) => tradingMap.set(t.user_id, t));

      // Get my profile for location matching
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const myReach = myTrading?.connection_reach;

      const candidates: MatchCandidate[] = eligibleProfiles
        .map((p: any) => {
          const t = tradingMap.get(p.id);
          const result = computeMatch(myTrading, t, myProfile, p);
          if (result.excluded) return null;
          const { pct, reasons } = result;

          // Location bonus for Local reach
          let locationBonus = 0;
          if (myReach === "Local" && myProfile) {
            if (myProfile.country && p.country && myProfile.country.toLowerCase() === p.country.toLowerCase()) {
              locationBonus += 5;
              if (myProfile.state && p.state && myProfile.state.toLowerCase() === p.state.toLowerCase()) {
                locationBonus += 5;
                if (myProfile.city && p.city && myProfile.city.toLowerCase() === p.city.toLowerCase()) {
                  locationBonus += 5;
                  reasons.push("Same city");
                }
              }
            }
          }

          // Format display location
          const locParts = [p.city, p.state, p.country].filter(Boolean);
          const displayLoc = locParts.length > 0 ? locParts.join(", ") : p.location;

          return {
            id: p.id,
            username: p.username,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            location: displayLoc,
            city: p.city,
            state: p.state,
            country: p.country,
            markets: t?.markets || [],
            trading_style: t?.trading_style || [],
            experience_level: t?.experience_level || null,
            sessions: t?.sessions || [],
            strategies: t?.strategies || [],
            matchPct: Math.min(pct + locationBonus, 100),
            whyMatch: reasons.slice(0, 2).join(" · "),
          };
        })
        .filter((c: MatchCandidate | null): c is MatchCandidate => c !== null)
        .filter((c: MatchCandidate) => {
          if (myReach === "Local" && myProfile?.country) {
            return c.country && c.country.toLowerCase() === myProfile.country.toLowerCase();
          }
          return true;
        })
        .sort((a: MatchCandidate, b: MatchCandidate) => b.matchPct - a.matchPct);

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
                onClick={() => navigate(`/profile/${m.id}`)}
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
                        @{m.username || "trader"}
                      </div>
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
