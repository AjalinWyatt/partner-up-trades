import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AnimatedGlobe from "@/components/AnimatedGlobe";
import MatchExpandedModal from "@/components/MatchExpandedModal";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { computeMatch } from "@/lib/matchUtils";

interface MatchCandidate {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  age: number | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  markets: string[];
  trading_style: string[];
  experience_level: string | null;
  sessions: string[];
  matchPct: number;
}

const FILTER_OPTIONS = {
  market: ["Forex", "Futures", "Options"],
  session: ["London", "New York", "Asian"],
  experience: ["Just getting started", "Building my edge", "Consistent & growing", "Profitable trader"],
};

const calcAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const Discover = () => {
  const { loading: guardLoading } = useOnboardingGuard();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ avatar_url: string | null; username: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ market: string | null; session: string | null; experience: string | null }>({
    market: null, session: null, experience: null,
  });
  const [expandedMatch, setExpandedMatch] = useState<MatchCandidate | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const [{ data: allConnections }, { data: blockedData }, { data: passedData }, { data: meData }] = await Promise.all([
        supabase.from("partner_connections").select("requester_id, receiver_id").or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`),
        supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
        supabase.from("passed_profiles").select("passed_id").eq("passer_id", user.id),
        supabase.from("profiles").select("avatar_url, username").eq("id", user.id).maybeSingle(),
      ]);
      setMe(meData || null);

      const excludedIds = new Set<string>([user.id]);
      (allConnections || []).forEach((c: any) => { excludedIds.add(c.requester_id); excludedIds.add(c.receiver_id); });
      (blockedData || []).forEach((b: any) => excludedIds.add(b.blocked_id));
      (passedData || []).forEach((p: any) => excludedIds.add(p.passed_id));

      const { data: myTrading } = await supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle();
      const { data: allProfiles } = await supabase.from("profiles").select("*").neq("id", user.id).eq("onboarding_completed", true);

      if (!allProfiles || allProfiles.length === 0) { setLoading(false); return; }
      const eligible = allProfiles.filter((p: any) => !excludedIds.has(p.id));
      if (eligible.length === 0) { setMatches([]); setLoading(false); return; }

      const userIds = eligible.map((p: any) => p.id);
      const { data: allTrading } = await supabase.from("trading_profiles").select("*").in("user_id", userIds);
      const tradingMap = new Map<string, any>();
      (allTrading || []).forEach((t: any) => tradingMap.set(t.user_id, t));

      const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const myReach = myTrading?.connection_reach;

      const candidates: MatchCandidate[] = eligible
        .map((p: any) => {
          const t = tradingMap.get(p.id);
          const result = computeMatch(myTrading, t, myProfile, p);
          if (result.excluded) return null;

          let locationBonus = 0;
          if (myReach === "Local" && myProfile) {
            if (myProfile.country && p.country && myProfile.country.toLowerCase() === p.country.toLowerCase()) {
              locationBonus += 5;
              if (myProfile.state && p.state && myProfile.state.toLowerCase() === p.state.toLowerCase()) {
                locationBonus += 5;
                if (myProfile.city && p.city && myProfile.city.toLowerCase() === p.city.toLowerCase()) locationBonus += 5;
              }
            }
          }

          const locParts = [p.city, p.state].filter(Boolean);
          const displayLoc = locParts.length > 0 ? locParts.join(", ") : (p.country || p.location);

          return {
            id: p.id,
            username: p.username,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            age: calcAge(p.date_of_birth),
            location: displayLoc,
            city: p.city, state: p.state, country: p.country,
            markets: t?.markets || [],
            trading_style: t?.trading_style || [],
            experience_level: t?.experience_level || null,
            sessions: t?.sessions || [],
            matchPct: Math.min(result.pct + locationBonus, 100),
          };
        })
        .filter((c: MatchCandidate | null): c is MatchCandidate => c !== null)
        .filter((c: MatchCandidate) => {
          if (myReach === "Local" && myProfile?.country) {
            return c.country && c.country.toLowerCase() === myProfile.country.toLowerCase();
          }
          return true;
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
      result = result.filter(m =>
        (m.full_name || "").toLowerCase().includes(q) ||
        (m.username || "").toLowerCase().includes(q) ||
        m.markets.some(mk => mk.toLowerCase().includes(q))
      );
    }
    if (filters.market) result = result.filter(m => m.markets.includes(filters.market!));
    if (filters.session) result = result.filter(m => m.sessions.includes(filters.session!));
    if (filters.experience) result = result.filter(m => m.experience_level === filters.experience);
    return result;
  }, [matches, searchQuery, filters]);

  const activeFilterCount = [filters.market, filters.session, filters.experience].filter(Boolean).length;

  if (guardLoading || loading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Header */}
        <div className="px-5 pt-5 flex items-center justify-between">
          <div className="w-12" />
          <h1 className="text-[24px] font-black tracking-tight">
            <span className="text-foreground">Traders</span><span className="text-foreground">World</span>
          </h1>
          <button
            onClick={() => navigate("/profile")}
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-border shrink-0"
          >
            {me?.avatar_url ? (
              <img src={me.avatar_url} className="w-full h-full object-cover" alt="me" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-black text-primary-foreground">
                {(me?.username || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
          </button>
        </div>

        {/* Globe */}
        <div className="mt-4 mb-2">
          <AnimatedGlobe />
        </div>

        {/* Title */}
        <h2
          className={`mt-2 mb-4 px-5 text-foreground tracking-tight ${
            filtered.length === 0 && matches.length === 0
              ? "mx-auto max-w-[320px] text-center text-[15px] font-medium leading-[1.55] text-foreground/88"
              : "text-[22px] font-black"
          }`}
        >
          {filtered.length === 0 && matches.length === 0
            ? "No traders match your criteria right now, please check back soon as new traders join daily"
            : "Some curated matches for you!"}
        </h2>

        {/* Search/filter removed to match design */}

        {/* Results — large card style matching mockup */}
        <div className="px-5 mt-2">
          {filtered.length === 0 ? null : (
            <div className="space-y-3">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/profile/${m.id}`)}
                  className="w-full bg-card border border-border rounded-2xl overflow-hidden flex items-stretch text-left hover:border-accent/40 transition-colors h-[96px]"
                >
                  <div className="w-[96px] h-full shrink-0 bg-secondary">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <span className="text-2xl font-bold text-foreground">
                          {(m.full_name || m.username || "?").slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[15px] font-bold text-accent truncate">
                          {m.full_name || `@${m.username}` || "Trader"}
                        </span>
                        {m.age && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-[14px] text-foreground font-bold">{m.age}</span>
                          </>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          <div className="relative w-[20px] h-[20px]">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                              <circle
                                cx="18" cy="18" r="16" fill="none"
                                stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={`${(m.matchPct / 100) * 100.53} 100.53`}
                              />
                            </svg>
                            <Zap
                              className="absolute inset-0 m-auto w-2.5 h-2.5 text-accent"
                              fill="currentColor"
                              strokeWidth={0}
                            />
                          </div>
                          <span className="text-[15px] font-black text-foreground">{m.matchPct}%</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">Match</span>
                      </div>
                    </div>

                    {m.location && (
                      <div className="text-[12px] text-foreground/90 truncate">{m.location}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Discover;
