import { supabase } from "@/integrations/supabase/client";
import { computeMatch } from "@/lib/matchUtils";

export interface MapTrader {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  markets: string[];
  trading_style: string[];
  matchPct: number;
  /** City-center coordinates — never a real address. */
  lat: number;
  lng: number;
  /** Randomized point within ~1 mile of the city center, for street-level zoom. */
  jlat: number;
  jlng: number;
  placeLabel: string;
}

const CACHE_KEY = "tw:city-coords:v1";

type Coords = { lat: number; lng: number };

function readCache(): Record<string, Coords> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(map: Record<string, Coords>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

/** Stable pseudo-random offset (≤ ~1 mile) derived from the user id — never a real location. */
function jitter(id: string, base: Coords): Coords {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  const radiusMiles = 0.25 + ((h >> 9) % 750) / 1000; // 0.25 – 1.0 mi
  const dLat = (radiusMiles / 69) * Math.sin(angle);
  const dLng =
    (radiusMiles / (69 * Math.max(0.2, Math.cos((base.lat * Math.PI) / 180)))) * Math.cos(angle);
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

export function placeKey(p: { city?: string | null; state?: string | null; country?: string | null }) {
  return [p.city, p.state, p.country].filter(Boolean).join(", ");
}

export async function geocodePlaces(places: string[]): Promise<Record<string, Coords>> {
  const cache = readCache();
  const missing = places.filter((p) => p && !cache[p]);
  if (missing.length > 0) {
    const { data, error } = await supabase.functions.invoke("geocode-cities", {
      body: { places: missing.slice(0, 60) },
    });
    if (!error && data?.results) {
      Object.assign(cache, data.results);
      writeCache(cache);
    }
  }
  return cache;
}

const profileFields =
  "id, username, full_name, avatar_url, gender, hobbies, city, state, country, show_on_map";
const tradingFields =
  "user_id, markets, sessions, strategies, trading_style, timeframes, experience_level, primary_goal, struggles, looking_for_gender, connection_types, instruments";

export async function getMapTraders(userId: string): Promise<MapTrader[]> {
  const [{ data: blocked }, { data: blockedBy }, { data: myTrading }, { data: myProfile }] =
    await Promise.all([
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId),
      supabase.from("blocked_users").select("blocker_id").eq("blocked_id", userId),
      supabase.from("trading_profiles").select(tradingFields).eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("gender, hobbies").eq("id", userId).maybeSingle(),
    ]);

  const excluded = new Set<string>([userId]);
  (blocked || []).forEach((b: any) => excluded.add(b.blocked_id));
  (blockedBy || []).forEach((b: any) => excluded.add(b.blocker_id));

  const { data: profiles } = await supabase
    .from("profiles")
    .select(profileFields)
    .neq("id", userId)
    .eq("onboarding_completed", true)
    .eq("show_on_map", true)
    .limit(500);

  const eligible = (profiles || []).filter(
    (p: any) => !excluded.has(p.id) && (p.city || p.country),
  );
  if (eligible.length === 0) return [];

  const { data: trading } = await supabase
    .from("trading_profiles")
    .select(tradingFields)
    .in("user_id", eligible.map((p: any) => p.id));
  const tradingMap = new Map<string, any>();
  (trading || []).forEach((t: any) => tradingMap.set(t.user_id, t));

  const keys = [...new Set(eligible.map((p: any) => placeKey(p)).filter(Boolean))];
  const coords = await geocodePlaces(keys);

  const out: MapTrader[] = [];
  for (const p of eligible as any[]) {
    const key = placeKey(p);
    const base = coords[key];
    if (!base) continue;
    const t = tradingMap.get(p.id);
    const match = computeMatch(myTrading as any, t, myProfile as any, p);
    const j = jitter(p.id, base);
    out.push({
      id: p.id,
      username: p.username,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      city: p.city,
      state: p.state,
      country: p.country,
      markets: t?.markets || [],
      trading_style: t?.trading_style || [],
      matchPct: match.excluded ? Math.max(20, Math.round(match.pct * 0.5)) : match.pct,
      lat: base.lat,
      lng: base.lng,
      jlat: j.lat,
      jlng: j.lng,
      placeLabel: key,
    });
  }
  return out;
}

export function milesBetween(a: Coords, b: Coords) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
