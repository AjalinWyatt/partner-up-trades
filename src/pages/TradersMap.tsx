import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Navigation,
  List,
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
import { MapTrader, getMapTraders, geocodePlaces, milesBetween, placeKey, resolveMyApproxLocation } from "@/lib/tradersMap";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MARKETS = ["All", "Forex", "Futures", "Options"] as const;

type Tier = "world" | "country" | "city" | "street";
const tierFor = (z: number): Tier => (z < 3 ? "world" : z < 6 ? "country" : z < 9 ? "city" : "street");

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

function avatarIcon(url: string) {
  const safeUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <defs><clipPath id="c"><circle cx="22" cy="22" r="16"/></clipPath></defs>
    <circle cx="22" cy="22" r="19" fill="#071113" stroke="#18aaa5" stroke-width="1.5"/>
    <image href="${safeUrl}" x="6" y="6" width="32" height="32" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>
    <circle cx="35" cy="35" r="4" fill="#16c784" stroke="#071113" stroke-width="2"/>
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
  const radiusRef = useRef<google.maps.Circle | null>(null);

  const [traders, setTraders] = useState<MapTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(9);
  const [market, setMarket] = useState<(typeof MARKETS)[number]>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<MapTrader | null>(null);
  const [browsingNearby, setBrowsingNearby] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [exploreLoc, setExploreLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [exploreLabel, setExploreLabel] = useState("");
  const [searching, setSearching] = useState(false);
  const centerLoc = useMemo(() => exploreLoc ?? userLoc, [exploreLoc, userLoc]);

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

  /* ------------- user location (approximate, refreshed when stale) ------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const loc = await resolveMyApproxLocation(session.user.id);
      if (!cancelled && loc) setUserLoc(loc);
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---------------- map init ---------------- */
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapDivRef.current) return;
        const map = new maps.Map(mapDivRef.current, {
          center: { lat: 33.749, lng: -84.388 },
          zoom: 9,
          minZoom: 8,
          maxZoom: 14,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          backgroundColor: "#05070a",
          clickableIcons: false,
        });
        mapRef.current = map;
        map.addListener("zoom_changed", () => setZoom(map.getZoom() ?? 9));
        map.addListener("idle", () => setZoom(map.getZoom() ?? 9));
        map.addListener("click", () => setSelected(null));
        setMapReady(true);
      })
      .catch((e) => setMapError(e.message || "Map failed to load"));
    return () => {
      cancelled = true;
    };
  }, []);

  /* Keep the map centered on the active area (Near Me or Explore) and bounded to 50 miles. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !centerLoc) return;
    const latDelta = 50 / 69;
    const lngDelta = 50 / (69 * Math.max(0.25, Math.cos((centerLoc.lat * Math.PI) / 180)));
    map.setOptions({ restriction: null });
    map.setCenter(centerLoc);
    map.setZoom(9);
    map.setOptions({
      restriction: {
        latLngBounds: {
          north: centerLoc.lat + latDelta,
          south: centerLoc.lat - latDelta,
          east: centerLoc.lng + lngDelta,
          west: centerLoc.lng - lngDelta,
        },
        strictBounds: true,
      },
    });
    radiusRef.current?.setMap(null);
    radiusRef.current = new google.maps.Circle({
      map,
      center: centerLoc,
      radius: 80467.2,
      strokeColor: "#18aaa5",
      strokeOpacity: 0.8,
      strokeWeight: 1,
      fillColor: "#18aaa5",
      fillOpacity: 0.035,
      clickable: false,
    });
    return () => radiusRef.current?.setMap(null);
  }, [mapReady, centerLoc]);

  /* ---------------- filtering ---------------- */
  const localTraders = useMemo(
    () => centerLoc ? traders.filter((t) => milesBetween(centerLoc, { lat: t.lat, lng: t.lng }) <= 50) : [],
    [traders, centerLoc],
  );

  const filtered = useMemo(() => {
    let list = localTraders;
    if (market !== "All") list = list.filter((t) => t.markets.includes(market));
    return list;
  }, [localTraders, market]);

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

    if (true) {
      const z = zoom;
      const cell = z >= 13 ? 60 : z >= 11 ? 30 : z >= 10 ? 18 : 10;
      const nearbyGroups = new Map<string, MapTrader[]>();
      filtered.forEach((t) => {
        const key = `${Math.round(t.jlat * cell)}:${Math.round(t.jlng * cell)}`;
        nearbyGroups.set(key, [...(nearbyGroups.get(key) || []), t]);
      });
      nearbyGroups.forEach((group) => {
        const t = group[0];
        if (!t) return;
        const lat = group.reduce((sum, trader) => sum + trader.jlat, 0) / group.length;
        const lng = group.reduce((sum, trader) => sum + trader.jlng, 0) / group.length;
        const marker = new google.maps.Marker({
          map,
          position: { lat, lng },
          icon: group.length > 1
            ? { url: clusterIcon(group.length, "#18aaa5"), scaledSize: new google.maps.Size(42, 42), anchor: new google.maps.Point(21, 21) }
            : {
                url: t.avatar_url ? avatarIcon(t.avatar_url) : pinIcon(initials(t), "#18aaa5"),
                scaledSize: new google.maps.Size(44, 44),
                anchor: new google.maps.Point(22, 22),
              },
          title: group.length > 1 ? `${group.length} nearby traders` : `${t.full_name || t.username || "Trader"} · ${t.matchPct}% match`,
          optimized: false,
        });
        marker.addListener("click", () => {
          if (group.length === 1) {
            navigate(`/profile/${t.id}`);
            return;
          }
          if ((map.getZoom() ?? 9) < 14) {
            map.panTo({ lat, lng });
            map.setZoom(Math.min(14, (map.getZoom() ?? 9) + 2));
          }
          setBrowsingNearby(true);
        });
        markersRef.current.push(marker);
      });
    } else {
      clusters.forEach((c) => {
        const color = "#18aaa5";
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
          map.panTo({ lat: c.lat, lng: c.lng });
          map.setZoom(Math.min(16, (map.getZoom() ?? 2) + (tier === "world" ? 3 : tier === "country" ? 3 : 4)));
        });
        markersRef.current.push(marker);
      });
    }
  }, [filtered, zoom, mapReady, navigate]);

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
    const l = map.addListener("idle", update) as google.maps.MapsEventListener | undefined;
    return () => {
      try {
        l?.remove();
      } catch {
        /* noop */
      }
    };
  }, [filtered, mapReady]);

  const visibleTraders = useMemo(() => {
    const set = new Set(visibleIds);
    const list = filtered.filter((t) => set.has(t.id));
    if (!centerLoc) return list;
    return list.sort(
      (a, b) => milesBetween(centerLoc, { lat: a.lat, lng: a.lng }) - milesBetween(centerLoc, { lat: b.lat, lng: b.lng }),
    );
  }, [filtered, visibleIds, centerLoc]);

  const listTraders = useMemo(() => {
    if (!centerLoc) return filtered;
    return [...filtered].sort(
      (a, b) => milesBetween(centerLoc, { lat: a.lat, lng: a.lng }) - milesBetween(centerLoc, { lat: b.lat, lng: b.lng }),
    );
  }, [filtered, centerLoc]);

  const flyToMe = () => {
    if (exploreLoc) { setExploreLoc(null); setExploreLabel(""); setBrowsingNearby(false); return; }
    if (!userLoc) return;
    mapRef.current?.panTo(userLoc);
    mapRef.current?.setZoom(10);
  };

  const returnToNearMe = () => {
    setExploreLoc(null);
    setExploreLabel("");
    setSearch("");
    setBrowsingNearby(false);
  };

  const nudgeZoom = (d: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max(1, Math.min(16, (map.getZoom() ?? 2) + d)));
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await geocodePlaces([q]);
      const hit = res[q];
      if (hit) {
        setExploreLoc(hit);
        setExploreLabel(q);
        setSearch("");
        setBrowsingNearby(true);
      } else {
        toast.error("Couldn't find that location");
      }
    } finally {
      setSearching(false);
    }
  };

  const distanceLabel = (t: MapTrader) =>
    centerLoc ? `${milesBetween(centerLoc, { lat: t.lat, lng: t.lng }).toFixed(1)} miles away` : t.placeLabel;

  const sheetTraders = selected
    ? [selected, ...visibleTraders.filter((t) => t.id !== selected.id)]
    : visibleTraders;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div ref={mapDivRef} className={cn("absolute inset-0", viewMode === "list" && "invisible pointer-events-none")} />

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

      <div className="absolute inset-x-0 top-0 z-20 px-3 pt-safe-3 pb-8 bg-gradient-to-b from-background via-background/70 to-transparent">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate("/discover")}
            aria-label="Back to Discover"
            className="h-9 w-9 shrink-0 rounded-full bg-card/80 backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <form onSubmit={runSearch} className="flex-1 min-w-0">
            <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-card/80 px-3 backdrop-blur-md">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (!e.target.value) setBrowsingNearby(false);
                }}
                placeholder={exploreLabel ? `Exploring ${exploreLabel}` : "Search a city, state, or country"}
                className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <Button type="button" variant="ghost" size="icon" onClick={() => { setSearch(""); setBrowsingNearby(false); }} aria-label="Clear search" className="h-6 w-6 rounded-full">
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </form>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filters"
            className={cn(
              "h-9 w-9 shrink-0 rounded-full bg-card/80 backdrop-blur-md",
              showFilters && "border-accent/70 text-accent",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setViewMode((v) => (v === "map" ? "list" : "map"))}
            aria-label={viewMode === "map" ? "Switch to list view" : "Switch to map view"}
            className={cn(
              "h-9 w-9 shrink-0 rounded-full bg-card/80 backdrop-blur-md hover:bg-card/80",
              viewMode === "list" ? "border-accent/70 text-accent hover:text-accent" : "hover:text-foreground",
            )}
          >
            {viewMode === "map" ? <List className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mt-3 flex items-start gap-2 pl-1">
          <MapPin className="mt-0.5 h-4 w-4 text-accent" />
          <div>
            <p className="text-[12px] font-semibold text-foreground">Traders near you</p>
            <p className="text-[10px] text-muted-foreground">Showing traders within 50 miles.</p>
          </div>
        </div>

        {showFilters && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pl-1 no-scrollbar">
            {MARKETS.map((m) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                key={m}
                onClick={() => setMarket(m)}
                className={cn(
                  "h-7 shrink-0 rounded-full bg-card/80 px-3 text-[10px] backdrop-blur-md",
                  market === m && "border-accent/70 text-accent",
                )}
              >
                {m}
              </Button>
            ))}
          </div>
        )}
      </div>

      {viewMode === "list" && (
        <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain bg-background pb-safe-3 pt-[104px]">
          <div className="px-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-foreground">Traders nearby ({listTraders.length})</h2>
              <span className="text-[9px] text-muted-foreground">Nearest first</span>
            </div>
            {listTraders.length > 0 ? (
              listTraders.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/profile/${t.id}`)}
                  className="h-auto w-full justify-start gap-3 rounded-none border-b border-border/70 px-0 py-3 text-left last:border-0 hover:bg-transparent"
                >
                  <Avatar t={t} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[12px] font-semibold text-foreground">{t.full_name || `@${t.username}`}</span>
                      <span className="shrink-0 text-[9px] text-muted-foreground">{distanceLabel(t)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {[t.placeLabel, t.markets[0], t.trading_style[0]].filter(Boolean).join("  ·  ") || "Trader"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-accent">{t.matchPct}%</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              ))
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
                <h2 className="mt-2 text-[12px] font-semibold text-foreground">No traders nearby</h2>
                <p className="mt-1 max-w-[280px] text-[10px] leading-4 text-muted-foreground">
                  We couldn't find any traders within 50 miles right now. Try adjusting your filters or check back later.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters(true)} className="mt-3 h-7 rounded-full border-accent/70 px-7 text-[9px] text-accent">
                  Adjust Filters
                </Button>
              </div>
            )}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" />
              Exact locations are never shared
            </div>
          </div>
        </div>
      )}

      {viewMode === "map" && (
      <div className="absolute right-3 top-[43%] z-20 flex -translate-y-1/2 flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={flyToMe}
          aria-label="Center on my area"
          disabled={!userLoc}
          className="h-9 w-9 rounded-full bg-card/90 backdrop-blur-md disabled:opacity-40"
        >
          <Navigation className="h-4 w-4 -rotate-12" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => nudgeZoom(1)}
          aria-label="Zoom in"
          className="h-9 w-9 rounded-full bg-card/90 backdrop-blur-md"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => nudgeZoom(-1)}
          aria-label="Zoom out"
          className="h-9 w-9 rounded-full bg-card/90 backdrop-blur-md"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
      )}

      {viewMode === "map" && (
      <div className="absolute inset-x-0 bottom-0 z-20 max-h-[46vh] overflow-y-auto rounded-t-[22px] border-t border-border bg-card/95 pb-safe-3 backdrop-blur-xl">
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-muted" />
        <div className="px-4 pb-3 pt-3">
          {!browsingNearby && localTraders.length > 0 ? (
            <div className="py-1">
              <h2 className="text-[14px] font-semibold text-foreground">Discover traders within 50 miles</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Tap a trader to view their profile.</p>
              <div className="mt-3 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                <Lock className="h-3 w-3 shrink-0" />
                Exact locations are never shared
              </div>
            </div>
          ) : sheetTraders.length > 0 ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-[12px] font-semibold text-foreground">Traders nearby ({sheetTraders.length})</h2>
                <span className="text-[9px] text-muted-foreground">Nearest⌄</span>
              </div>
              {sheetTraders.slice(0, 4).map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/profile/${t.id}`)}
                  className="h-auto w-full justify-start gap-3 rounded-none border-b border-border/70 px-0 py-2.5 text-left last:border-0 hover:bg-transparent"
                >
                  <Avatar t={t} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[11px] font-semibold text-foreground">{t.full_name || `@${t.username}`}</span>
                      <span className="shrink-0 text-[9px] text-muted-foreground">{distanceLabel(t)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                      {[t.markets[0], t.trading_style[0]].filter(Boolean).join("  ·  ") || "Trader"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Search className="h-4 w-4" />
              </div>
              <h2 className="mt-2 text-[12px] font-semibold text-foreground">No traders nearby</h2>
              <p className="mt-1 max-w-[280px] text-[9px] leading-4 text-muted-foreground">
                We couldn't find any traders within 50 miles right now. Try adjusting your filters or check back later.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters(true)} className="mt-3 h-7 rounded-full border-accent/70 px-7 text-[9px] text-accent">
                Adjust Filters
              </Button>
            </div>
          )}
        </div>
      </div>
      )}
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
