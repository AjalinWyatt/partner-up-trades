import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Cloud, MapPin, Search, Sparkles, UserRound, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { DiscoverMatchCandidate, getDiscoverMatches } from "@/lib/discoverMatches";
import { useSessionCache } from "@/hooks/use-session-cache";
import { DestinationLoading, DestinationState } from "@/components/DestinationState";
import globeImage from "@/assets/tradersworld-globe.png";

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

  const visibleMatches = filtered.slice(0, 5);
  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() <= 5 * 60 * 1000;
  };

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
        <header className="sticky top-0 z-30 overflow-hidden border-b border-border/70 bg-background px-4 pb-0 pt-safe-5">
          <img src={globeImage} alt="" className="pointer-events-none absolute -right-11 -top-20 h-[210px] w-[210px] object-contain opacity-80" />
          <div className="relative flex items-start justify-between gap-4 px-1">
            <div className="pt-1">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.32em] text-foreground/80">Find your people</p>
              <h1 className="font-serif text-[36px] font-normal leading-none text-foreground">Discover</h1>
              <p className="mt-2 text-[12px] text-muted-foreground">Traders who align with your mindset.</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSearch((value) => !value)}
              aria-label={showSearch ? "Close search" : "Search traders"}
              className="relative mt-0.5 h-10 w-10 rounded-full border-border bg-background/80 text-foreground hover:bg-secondary hover:text-accent"
            >
              {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>
          </div>
          {showSearch && (
            <div className="relative mt-3 px-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search traders"
                className="h-10 w-full border-0 border-b border-border bg-transparent pl-8 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
              />
            </div>
          )}
          <div className="relative mt-5 grid grid-cols-2 border-b border-border/70 text-center text-[11px] font-semibold">
            <button className="relative pb-3 text-accent after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-accent">For You</button>
            <button onClick={() => navigate("/map")} className="pb-3 text-muted-foreground transition-colors hover:text-foreground">Nearby</button>
          </div>
        </header>

        <div className="px-3 pt-2">
          {loadError ? (
            <DestinationState kind="error" title="We lost the signal" description="Your matches could not be loaded. Your preferences are safe." actionLabel="Try again" onAction={() => { setLoading(true); setReloadKey((key) => key + 1); }} />
          ) : visibleMatches.length === 0 ? (
            <div className="flex min-h-[490px] flex-col items-center justify-center px-8 pb-10 text-center">
              <div className="relative mb-7 h-32 w-48 text-accent/35" aria-hidden="true">
                <Cloud className="absolute left-0 top-8 h-10 w-10 fill-current opacity-45" />
                <Cloud className="absolute right-0 top-16 h-11 w-11 fill-current opacity-45" />
                <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] rounded-full bg-accent/5" />
                <span className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent/10">
                  <UserRound className="h-14 w-14 text-muted-foreground" strokeWidth={1.6} />
                </span>
                <Sparkles className="absolute right-8 top-0 h-7 w-7 text-accent/70" />
                <Sparkles className="absolute bottom-2 left-4 h-3 w-3 text-accent/60" />
              </div>
              <h2 className="font-serif text-[23px] font-normal text-foreground">No matches yet</h2>
              <p className="mt-2 max-w-[285px] text-[12px] leading-5 text-muted-foreground">
                {searchQuery ? "No traders match this search yet. Clear it or check out traders near you." : "We're still learning your preferences. Try adjusting your profile or check out traders near you."}
              </p>
              <Button variant="outline" onClick={searchQuery ? () => setSearchQuery("") : () => navigate("/map")} className="mt-6 h-10 rounded-full border-accent/50 bg-transparent px-5 text-[12px] font-semibold text-accent hover:bg-accent/10 hover:text-accent">
                {searchQuery ? <Search className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                {searchQuery ? "Clear Search" : "View Nearby Traders"}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
              {visibleMatches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`, { state: { matchPct: m.matchPct } })}
                  className="flex h-[82px] w-full items-center gap-3 rounded-lg border border-border/70 bg-card/55 p-2 text-left transition-colors hover:bg-secondary/45"
                >
                  <div className="relative h-[66px] w-[66px] shrink-0 overflow-visible">
                    <div className="h-full w-full overflow-hidden rounded-md bg-secondary">
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
                    {isOnline(m.last_seen_at) && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" aria-label="Online" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                          {m.full_name || (m.username ? `@${m.username}` : "Trader")}
                        </span>
                        {m.age && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">{m.age}</span>
                          </>
                        )}
                    </div>
                    {m.username && <p className="truncate text-[9px] text-muted-foreground">@{m.username}</p>}
                    {m.location && (
                      <div className="mt-0.5 flex items-center gap-0.5 truncate text-[9px] text-muted-foreground"><MapPin className="h-2.5 w-2.5 shrink-0" />{m.location}</div>
                    )}
                    <div className="mt-1 flex min-w-0 gap-1 overflow-hidden text-[7px] font-semibold uppercase text-foreground/80">
                      {[m.markets[0], m.trading_style[0]].filter(Boolean).map((label) => (
                        <span key={label} className="truncate rounded bg-secondary px-1.5 py-0.5">{label}</span>
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
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground" />
                </button>
              ))}
              </div>
              {visibleMatches.length < 5 && !searchQuery && (
                <div className="flex flex-col items-center px-7 pb-7 pt-8 text-center">
                  <div className="relative h-24 w-44 overflow-hidden" aria-hidden="true">
                    <div className="absolute inset-x-0 bottom-0 h-16 rotate-[-8deg] border border-accent/10 bg-[linear-gradient(hsl(var(--accent)/.06)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--accent)/.06)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    <MapPin className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2 fill-accent text-accent" />
                    <MapPin className="absolute left-8 top-7 h-7 w-7 fill-accent/25 text-accent/35" />
                    <MapPin className="absolute right-8 top-8 h-7 w-7 fill-accent/25 text-accent/35" />
                    <span className="absolute bottom-2 left-1/2 h-10 w-20 -translate-x-1/2 rounded-[50%] border border-accent/50 bg-accent/10" />
                  </div>
                  <h2 className="mt-3 font-serif text-[21px] font-normal text-foreground">Maybe check out someone nearby?</h2>
                  <p className="mt-2 max-w-[270px] text-[11px] leading-5 text-muted-foreground">Expand your search to see traders in your area who also align with your mindset.</p>
                  <Button variant="outline" onClick={() => navigate("/map")} className="mt-4 h-10 rounded-full border-accent/55 bg-transparent px-5 text-[12px] font-semibold text-accent hover:bg-accent/10 hover:text-accent">
                    <MapPin className="h-4 w-4" /> View Nearby Traders
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Discover;
