import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Crosshair,
  Globe2,
  Loader2,
  Lock,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { DARK_MAP_STYLE, loadGoogleMaps } from "@/lib/googleMaps";
import { MapTrader, getMapTraders, geocodePlaces, milesBetween, placeKey } from "@/lib/tradersMap";
import { cn } from "@/lib/utils";

const MARKETS = ["All", "Forex", "Futures", "Options"] as const;

const matchColor = (pct: number) =>
  pct >= 80 ? "#22c55e" : pct >= 60 ? "#3b82f6" : "#f0b429";

type Tier = "world" | "country" | "city" | "street";
const tierFor = (z: number): Tier => (z < 3 ? "world" : z < 6 ? "country" : z < 10 ? "city" : "street");

const initials = (t: { full_name: string | null; username: string | null }) =>
  (t.full_name || t.username || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function clusterIcon(count: number, color: string) {
  const r = count > 99 ? 26 : count > 9 ? 22 : 18;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r * 2 + 16}" height="${r * 2 + 16}" viewBox="0 0 ${r * 2 + 16} ${r * 2 + 16}">
    <circle cx="${r + 8}" cy="${r + 8}" r="${r + 6}" fill="${color}" fill-opacity="0.15"/>
    <circle cx="${r + 8}" cy="${r + 8}" r="${r}" fill="${color}" fill-opacity="0.28" stroke="${color}" stroke-width="2"/>
    <text x="${r + 8}" y="${r + 12}" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="${count > 99 ? 13 : 14}" font-weight="800" fill="#ffffff">${count}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function pinIcon(text: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="62" viewBox="0 0 54 62">
    <circle cx="27" cy="24" r="22" fill="${color}" fill-opacity="0.18"/>
    <circle cx="27" cy="24" r="17" fill="#0b0e11" stroke="${color}" stroke-width="3"/>
    <text x="27" y="29" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="800" fill="#ffffff">${text}</text>
    <path d="M27 44 L21 54 L33 54 Z" fill="${color}"/>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

const dotIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.2"/>
    <circle cx="12" cy="12" r="4.5" fill="${color}"/>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
};

const meIcon = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">
    <circle cx="23" cy="23" r="21" fill="#00e5e5" fill-opacity="0.12"/>
    <circle cx="23" cy="23" r="13" fill="#00e5e5" fill-opacity="0.22"/>
    <circle cx="23" cy="23" r="6" fill="#00e5e5" stroke="#0b0e11" stroke-width="2"/>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
};

interface Cluster {
  key: string;
  label: string;
  count: number;
  lat: number;
  lng: number;
}

export default function TradersMap() {
  const navigate = useNavigate();
  const { loading: guardLoading } = useOnboardingGuard();

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const meMarkerRef = useRef<google.maps.Marker | null>(null);
  const spinRef = useRef<number | null>(null);

  const [traders, setTraders] = useState<MapTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.6);
  const [market, setMarket] = useState<(typeof MARKETS)[number]>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<MapTrader | null>(null);
  const [cityLabel, setCityLabel] = useState<string | null>(null);

  const tier = tierFor(zoom);

  /* ---------------- data ---------------- */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      try {
        setTraders(await getMapTraders(user.id));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ------------- user location (session only, never stored) ------------- */
  useEffect(() => {
    let cancelled = false;
    const fallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("city, state, country")
        .eq("id", session.user.id)
        .maybeSingle();
      const key = p ? placeKey(p) : "";
      if (!key) return;
      const coords = await geocodePlaces([key]);
      if (!cancelled && coords[key]) setUserLoc(coords[key]);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => fallback(),
        { timeout: 8000 },
      );
    } else {
      fallback();
    }
    return () => { cancelled = true; };
  }, []);

  /* ---------------- map init ---------------- */
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapDivRef.current) return;
        const map = new maps.Map(mapDivRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 1.6,
          minZoom: 1,
          maxZoom: 16,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          backgroundColor: "#05070a",
          clickableIcons: false,
        });
        mapRef.current = map;
        map.addListener("zoom_changed", () => setZoom(map.getZoom() ?? 1.6));
        map.addListener("idle", () => setZoom(map.getZoom() ?? 1.6));
        map.addListener("dragstart", stopSpin);
        map.addListener("click", () => setSelected(null));
        setMapReady(true);
        startSpin();
      })
      .catch((e) => setMapError(e.message || "Map failed to load"));
    return () => {
      cancelled = true;
      stopSpin();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSpin = useCallback(() => {
    if (spinRef.current) {
      window.clearInterval(spinRef.current);
      spinRef.current = null;
    }
  }, []);

  const startSpin = useCallback(() => {
    stopSpin();
    spinRef.current = window.setInterval(() => {
      const map = mapRef.current;
      if (!map) return;
      if ((map.getZoom() ?? 0) > 3) return stopSpin();
      const c = map.getCenter();
      if (c) map.setCenter({ lat: c.lat(), lng: c.lng() + 0.35 });
    }, 60);
  }, [stopSpin]);

  /* ---------------- filtering ---------------- */
  const filtered = useMemo(() => {
    let list = traders;
    if (market !== "All") list = list.filter((t) => t.markets.includes(market));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((t) => t.placeLabel.toLowerCase().includes(q));
    return list;
  }, [traders, market, search]);

  /* ---------------- clustering by tier ---------------- */
  const clusters = useMemo<Cluster[]>(() => {
    if (tier === "street") return [];
    const groups = new Map<string, { label: string; lat: number; lng: number; count: number }>();
    for (const t of filtered) {
      const key =
        tier === "world" ? t.country || "Unknown"
        : tier === "country" ? [t.state || t.city, t.country].filter(Boolean).join(", ")
        : [t.city || t.state, t.country].filter(Boolean).join(", ");
      const label =
        tier === "world" ? t.country || "Unknown"
        : tier === "country" ? t.state || t.city || t.country || "Unknown"
        : t.city || t.state || t.country || "Unknown";
      const g = groups.get(key);
      if (g) {
        g.count += 1;
        g.lat += t.lat;
        g.lng += t.lng;
      } else {
        groups.set(key, { label, lat: t.lat, lng: t.lng, count: 1 });
      }
    }
    return [...groups.entries()].map(([key, g]) => ({
      key,
      label: g.label,
      count: g.count,
      lat: g.lat / g.count,
      lng: g.lng / g.count,
    }));
  }, [filtered, tier]);

  /* ---------------- render markers ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (tier === "street") {
      filtered.forEach((t) => {
        const marker = new google.maps.Marker({
          map,
          position: { lat: t.jlat, lng: t.jlng },
          icon: {
            url: pinIcon(initials(t), matchColor(t.matchPct)),
            scaledSize: new google.maps.Size(54, 62),
            anchor: new google.maps.Point(27, 58),
          },
          title: `${t.full_name || t.username || "Trader"} · ${t.matchPct}% match`,
          optimized: false,
        });
        marker.addListener("click", () => setSelected(t));
        markersRef.current.push(marker);
      });
    } else {
      clusters.forEach((c) => {
        const color = "#00e5e5";
        const marker = new google.maps.Marker({
          map,
          position: { lat: c.lat, lng: c.lng },
          icon:
            tier === "world" && c.count < 2
              ? { url: dotIcon(color), scaledSize: new google.maps.Size(24, 24), anchor: new google.maps.Point(12, 12) }
              : {
                  url: clusterIcon(c.count, color),
                  scaledSize: new google.maps.Size(c.count > 99 ? 68 : c.count > 9 ? 60 : 52, c.count > 99 ? 68 : c.count > 9 ? 60 : 52),
                  anchor: new google.maps.Point(c.count > 99 ? 34 : c.count > 9 ? 30 : 26, c.count > 99 ? 34 : c.count > 9 ? 30 : 26),
                },
          label:
            tier === "world" || tier === "city"
              ? {
                  text: `${c.label} · ${c.count} trader${c.count === 1 ? "" : "s"}`,
                  className: "tw-map-label",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "700",
                }
              : {
                  text: `${c.label} · ${c.count}`,
                  className: "tw-map-label",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "700",
                },
          optimized: false,
        });
        marker.addListener("click", () => {
          stopSpin();
          map.panTo({ lat: c.lat, lng: c.lng });
          map.setZoom(Math.min(16, (map.getZoom() ?? 2) + (tier === "world" ? 3 : tier === "country" ? 3 : 4)));
          if (tier === "city") setCityLabel(`${c.label} · ${c.count} trader${c.count === 1 ? "" : "s"}`);
        });
        markersRef.current.push(marker);
      });
    }
  }, [clusters, filtered, tier, mapReady, stopSpin]);

  /* ---------------- me marker ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLoc) return;
    meMarkerRef.current?.setMap(null);
    meMarkerRef.current = new google.maps.Marker({
      map,
      position: userLoc,
      icon: { url: meIcon(), scaledSize: new google.maps.Size(46, 46), anchor: new google.maps.Point(23, 23) },
      zIndex: 999,
      title: "Approximately you",
      optimized: false,
    });
  }, [userLoc]);

  /* ---------------- nearby count in viewport ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const update = () => {
      const b = map.getBounds();
      if (!b) return;
      setVisibleIds(
        filtered
          .filter((t) => b.contains(new google.maps.LatLng(t.lat, t.lng)))
          .map((t) => t.id),
      );
    };
    update();
    const l = map.addListener("idle", update);
    return () => l.remove();
  }, [filtered, mapReady]);

  const visibleTraders = useMemo(() => {
    const set = new Set(visibleIds);
    const list = filtered.filter((t) => set.has(t.id));
    if (!userLoc) return list;
    return list.sort(
      (a, b) => milesBetween(userLoc, { lat: a.lat, lng: a.lng }) - milesBetween(userLoc, { lat: b.lat, lng: b.lng }),
    );
  }, [filtered, visibleIds, userLoc]);

  const flyToMe = () => {
    stopSpin();
    if (!userLoc) return;
    mapRef.current?.panTo(userLoc);
    mapRef.current?.setZoom(10);
  };

  const nudgeZoom = (d: number) => {
    stopSpin();
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max(1, Math.min(16, (map.getZoom() ?? 2) + d)));
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    stopSpin();
    const hit = traders.find((t) => t.placeLabel.toLowerCase().includes(q.toLowerCase()));
    if (hit) {
      mapRef.current?.panTo({ lat: hit.lat, lng: hit.lng });
      mapRef.current?.setZoom(9);
      return;
    }
    const coords = await geocodePlaces([q]);
    if (coords[q]) {
      mapRef.current?.panTo(coords[q]);
      mapRef.current?.setZoom(8);
    }
  };

  const distanceLabel = (t: MapTrader) =>
    userLoc ? `${milesBetween(userLoc, { lat: t.lat, lng: t.lng }).toFixed(1)} miles away` : t.placeLabel;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <div ref={mapDivRef} className="absolute inset-0" />

      {(loading || guardLoading || (!mapReady && !mapError)) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <Loader2 className="w-7 h-7 text-accent animate-spin" />
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-8 text-center">
          <p className="text-[13px] text-muted-foreground">{mapError}</p>
        </div>
      )}

      {/* ---------- top bar ---------- */}
      <div className="absolute top-0 inset-x-0 z-20 pt-safe-3 px-4 pb-2 bg-gradient-to-b from-background via-background/80 to-transparent">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/discover")}
            aria-label="Back to Discover"
            className="w-10 h-10 shrink-0 rounded-full border border-border bg-card/70 backdrop-blur-md flex items-center justify-center text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <form onSubmit={runSearch} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 h-10 px-3 rounded-full border border-border bg-card/70 backdrop-blur-md">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by city or country..."
                className="flex-1 min-w-0 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </form>

          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filters"
            className={cn(
              "w-10 h-10 shrink-0 rounded-full border backdrop-blur-md flex items-center justify-center",
              showFilters ? "border-accent bg-accent/15 text-accent" : "border-border bg-card/70 text-foreground",
            )}
          >
            <SlidersHorizontal className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* title overlay */}
        <div className="mt-3 flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-accent" />
          <span className="text-[14px] italic text-foreground/90">Traders are everywhere.</span>
        </div>

        {/* market pills */}
        {(showFilters || tier !== "world") && (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {MARKETS.map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={cn(
                  "shrink-0 px-3 h-8 rounded-full border text-[12px] font-bold backdrop-blur-md",
                  market === m
                    ? "border-accent bg-accent/[0.14] text-accent"
                    : "border-border bg-card/70 text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
            <span className="shrink-0 ml-auto px-3 h-8 flex items-center rounded-full border border-border bg-card/70 backdrop-blur-md text-[12px] font-bold text-foreground">
              {visibleTraders.length} nearby
            </span>
          </div>
        )}
      </div>

      {/* ---------- map controls ---------- */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        <button
          onClick={() => nudgeZoom(1)}
          aria-label="Zoom in"
          className="w-10 h-10 rounded-full border border-border bg-card/70 backdrop-blur-md flex items-center justify-center text-foreground"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => nudgeZoom(-1)}
          aria-label="Zoom out"
          className="w-10 h-10 rounded-full border border-border bg-card/70 backdrop-blur-md flex items-center justify-center text-foreground"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={flyToMe}
          aria-label="Fly to me"
          disabled={!userLoc}
          className="w-10 h-10 rounded-full border border-accent/60 bg-accent/15 backdrop-blur-md flex items-center justify-center text-accent disabled:opacity-40"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* ---------- mini card ---------- */}
      {selected && (
        <div className="absolute left-4 right-4 bottom-[190px] z-30">
          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl p-3 flex items-center gap-3">
            <Avatar t={selected} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-foreground truncate">
                {selected.full_name || `@${selected.username}`}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{distanceLabel(selected)}</div>
            </div>
            <span
              className="text-[12px] font-black shrink-0"
              style={{ color: matchColor(selected.matchPct) }}
            >
              {selected.matchPct}%
            </span>
            <button
              onClick={() => navigate(`/profile/${selected.id}`)}
              className="shrink-0 px-3 h-9 rounded-full bg-accent text-accent-foreground text-[12px] font-bold"
            >
              View Profile →
            </button>
          </div>
        </div>
      )}

      {/* ---------- bottom sheet ---------- */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-card/85 backdrop-blur-xl rounded-t-3xl pb-safe-3">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mt-2.5" />

        <div className="px-4 pt-3 pb-3">
          {tier === "street" ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-black text-foreground">
                  {visibleTraders.length} trader{visibleTraders.length === 1 ? "" : "s"} in view
                </span>
                <span className="text-[11px] text-muted-foreground">Swipe cards →</span>
              </div>
              {visibleTraders.length === 0 ? (
                <p className="mt-2 text-[12px] text-muted-foreground">No traders in this area yet.</p>
              ) : (
                <div className="mt-2.5 flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {visibleTraders.map((t) => (
                    <div
                      key={t.id}
                      className="shrink-0 w-[228px] rounded-2xl border border-border bg-secondary/60 p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar t={t} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-foreground truncate">
                            {t.full_name || `@${t.username}`}
                          </div>
                          {t.username && (
                            <div className="text-[11px] text-muted-foreground truncate">@{t.username}</div>
                          )}
                        </div>
                        <span className="text-[12px] font-black" style={{ color: matchColor(t.matchPct) }}>
                          {t.matchPct}%
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-foreground/80 truncate">
                        {[t.markets[0], t.trading_style[0]].filter(Boolean).join(" · ") || "Trader"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{distanceLabel(t)}</div>
                      <button
                        onClick={() => navigate(`/profile/${t.id}`)}
                        className="mt-2.5 w-full h-9 rounded-full bg-accent text-accent-foreground text-[12px] font-bold"
                      >
                        View Profile →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : tier === "city" ? (
            <div>
              <div className="text-[13px] font-black text-foreground">
                {cityLabel || `${visibleTraders.length} trader${visibleTraders.length === 1 ? "" : "s"} in view`}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Zoom in once more to see individual traders.
              </p>
            </div>
          ) : (
            <div>
              <div className="text-[13px] font-black text-foreground">Zoom in to find traders near you</div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Tap a glowing cluster to dive into a country or city.
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3 shrink-0" />
            Exact locations are never shared
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ t }: { t: MapTrader }) {
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0 border border-border">
      {t.avatar_url ? (
        <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[12px] font-black text-foreground">
          {initials(t)}
        </div>
      )}
    </div>
  );
}
