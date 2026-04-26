import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AnimatedGlobe from "@/components/AnimatedGlobe";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { DiscoverMatchCandidate, getDiscoverMatches } from "@/lib/discoverMatches";

type MatchCandidate = DiscoverMatchCandidate;

const FILTER_OPTIONS = {
  market: ["Forex", "Futures", "Options"],
  session: ["London", "New York", "Asian"],
  experience: ["Just getting started", "Building my edge", "Consistent & growing", "Profitable trader"],
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
  

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const { me, matches } = await getDiscoverMatches(user.id);
      setMe(me);
      setMatches(matches);
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
        <div className="px-5 pt-safe-5 flex items-center justify-between">
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
            ? "No traders match your criteria right now. Please check back soon."
            : "Some curated matches for you!"}
        </h2>

        {/* Search/filter removed to match design */}

        {/* Results - large card style matching mockup */}
        <div className="px-5 mt-2">
          {filtered.length === 0 ? null : (
            <div className="space-y-3">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`, { state: { matchPct: m.matchPct } })}
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
