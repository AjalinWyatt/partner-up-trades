import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AnimatedGlobe from "@/components/AnimatedGlobe";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { DiscoverMatchCandidate, getDiscoverMatches } from "@/lib/discoverMatches";
import { useSessionCache } from "@/hooks/use-session-cache";

type MatchCandidate = DiscoverMatchCandidate;

const FILTER_OPTIONS = {
  market: ["Forex", "Futures", "Options"],
  session: ["London", "New York", "Asian"],
  experience: ["Just getting started", "Building my edge", "Consistent & growing", "Profitable trader"],
};

const Discover = () => {
  const { loading: guardLoading } = useOnboardingGuard();
  const navigate = useNavigate();
  // Hydrate from sessionStorage so revisits paint instantly with last-known matches.
  const [matches, setMatches, hadMatchesCache] = useSessionCache<MatchCandidate[]>("discover:matches", []);
  const [me, setMe] = useSessionCache<{ avatar_url: string | null; username: string | null } | null>("discover:me", null);
  const [loading, setLoading] = useState(!hadMatchesCache);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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

  if ((guardLoading || loading) && !hadMatchesCache) {
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
      <div className="flex-1 overflow-y-auto bg-background pb-20 font-sans">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 px-5 pb-0 pt-safe-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-[27px] font-semibold tracking-normal text-foreground">Discover</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">Find traders who align with your mindset.</p>
            </div>
            <button
              onClick={() => setShowSearch((value) => !value)}
              aria-label={showSearch ? "Close search" : "Search traders"}
              className="mt-0.5 flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:text-accent"
            >
              {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
          </div>
          {showSearch && (
            <div className="relative mt-3">
              <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search traders"
                className="h-10 w-full border-0 border-b border-border bg-transparent pl-7 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
              />
            </div>
          )}
          <div className="mt-5 grid grid-cols-3 text-center text-[13px] font-semibold">
            <button className="relative pb-3 text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent">For You</button>
            <button onClick={() => navigate("/map")} className="pb-3 text-muted-foreground transition-colors hover:text-foreground">Nearby</button>
            <button className="pb-3 text-muted-foreground transition-colors hover:text-foreground">Similar</button>
          </div>
        </header>

        <div className="px-5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-foreground">No traders match your criteria right now.</p>
              <p className="mt-1 text-xs text-muted-foreground">Please check back soon.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`, { state: { matchPct: m.matchPct } })}
                  className="flex min-h-[106px] w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-secondary/25"
                >
                  <div className="h-[74px] w-[74px] shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary">
                        <span className="text-xl font-semibold text-muted-foreground">
                          {(m.full_name || m.username || "?").slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-[14px] font-semibold text-foreground">
                          {m.full_name || (m.username ? `@${m.username}` : "Trader")}
                        </span>
                        {m.age && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-[12px] text-muted-foreground">{m.age}</span>
                          </>
                        )}
                    </div>
                    {m.username && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">@{m.username}</p>}
                    {m.location && (
                      <div className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{m.location}</div>
                    )}
                    <div className="mt-2 flex min-w-0 gap-1.5 overflow-hidden">
                      {[m.markets[0], m.trading_style[0]].filter(Boolean).map((label) => (
                        <span key={label} className="truncate rounded-md border border-border bg-secondary/55 px-2 py-0.5 text-[10px] font-medium text-foreground/75">{label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="relative flex h-48px w-48px h-12 w-12 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                      <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${(m.matchPct / 100) * 125.66} 125.66`} />
                    </svg>
                    <span className="absolute text-[10px] font-semibold text-foreground">{m.matchPct}%</span>
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
