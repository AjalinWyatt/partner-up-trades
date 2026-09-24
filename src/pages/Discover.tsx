import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Search, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { DiscoverMatchCandidate, getDiscoverMatches } from "@/lib/discoverMatches";
import { useSessionCache } from "@/hooks/use-session-cache";
import { DestinationLoading, DestinationState } from "@/components/DestinationState";

type MatchCandidate = DiscoverMatchCandidate;

const Discover = () => {
  const { loading: guardLoading } = useOnboardingGuard();
  const navigate = useNavigate();
  // Hydrate from sessionStorage so revisits paint instantly with last-known matches.
  const [matches, setMatches, hadMatchesCache] = useSessionCache<MatchCandidate[]>("discover:matches", []);
  const [, setMe] = useSessionCache<{ avatar_url: string | null; username: string | null } | null>("discover:me", null);
  const [loading, setLoading] = useState(!hadMatchesCache);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  

  useEffect(() => {
    const load = async () => {
      setLoadError(false);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      try {
        const { me, matches } = await getDiscoverMatches(user.id);
        setMe(me);
        setMatches(matches);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reloadKey]);

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
    return result;
  }, [matches, searchQuery]);

  if ((guardLoading || loading) && !hadMatchesCache) {
    return (
      <AppLayout>
        <DestinationLoading label="Finding traders who fit your preferences." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-background font-sans">
        <header className="sticky top-0 z-30 bg-background/95 px-6 pb-0 pt-safe-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Find your people</p>
              <h1 className="font-serif text-[34px] font-normal leading-none text-foreground">Discover</h1>
              <p className="mt-2 text-[11px] text-muted-foreground">Traders who align with your mindset.</p>
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
          <div className="mt-5 grid grid-cols-3 border-b border-border/70 text-center text-[10px] font-semibold uppercase tracking-[0.16em]">
            <button className="relative pb-3 text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-accent">For You</button>
            <button onClick={() => navigate("/map")} className="pb-3 text-muted-foreground transition-colors hover:text-foreground">Nearby</button>
            <button className="pb-3 text-muted-foreground transition-colors hover:text-foreground">Similar</button>
          </div>
        </header>

        <div className="px-6">
          {loadError ? (
            <DestinationState kind="error" title="We lost the signal" description="Your matches could not be loaded. Your preferences are safe." actionLabel="Try again" onAction={() => { setLoading(true); setReloadKey((key) => key + 1); }} />
          ) : filtered.length === 0 ? (
            <DestinationState title={searchQuery ? "A quiet search" : "Your next match is coming"} description={searchQuery ? "No traders match this search yet. Clear it to return to your recommendations." : "No compatible traders are available right now. Check back as the community grows."} actionLabel={searchQuery ? "Clear search" : undefined} onAction={searchQuery ? () => setSearchQuery("") : undefined} />
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`, { state: { matchPct: m.matchPct } })}
                    className="flex min-h-[112px] w-full items-center gap-3 py-4 text-left transition-colors hover:bg-secondary/25"
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
                    <div className="mt-2 flex min-w-0 gap-3 overflow-hidden text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {[m.markets[0], m.trading_style[0]].filter(Boolean).map((label) => (
                        <span key={label} className="truncate">{label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                      <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${(m.matchPct / 100) * 125.66} 125.66`} />
                    </svg>
                    <span className="absolute text-[10px] font-semibold text-foreground">{m.matchPct}%</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
