import { supabase } from "@/integrations/supabase/client";
import { computeMatch } from "@/lib/matchUtils";

export interface DiscoverMatchCandidate {
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
  created_at: string | null;
}

const calcAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const profileFields = "id, username, full_name, avatar_url, gender, location, city, state, country, hobbies, date_of_birth, created_at";
const tradingFields = "user_id, markets, sessions, strategies, trading_style, experience_level, primary_goal, struggles, looking_for_gender, connection_reach";

export const getDiscoverMatches = async (userId: string, options?: { joinedAfter?: string }) => {
  const [{ data: allConnections }, { data: blockedData }, { data: passedData }, { data: myTrading }, { data: myProfile }] = await Promise.all([
    supabase
      .from("partner_connections")
      .select("requester_id, receiver_id")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .in("status", ["pending", "accepted"]),
    supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId),
    supabase.from("passed_profiles").select("passed_id").eq("passer_id", userId),
    supabase.from("trading_profiles").select(tradingFields).eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select(profileFields).eq("id", userId).maybeSingle(),
  ]);

  const excludedIds = new Set<string>([userId]);
  (allConnections || []).forEach((c: any) => { excludedIds.add(c.requester_id); excludedIds.add(c.receiver_id); });
  (blockedData || []).forEach((b: any) => excludedIds.add(b.blocked_id));
  (passedData || []).forEach((p: any) => excludedIds.add(p.passed_id));

  let profilesQuery = supabase
    .from("profiles")
    .select(profileFields)
    .neq("id", userId)
    .eq("onboarding_completed", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (options?.joinedAfter) profilesQuery = profilesQuery.gte("created_at", options.joinedAfter);

  const { data: allProfiles } = await profilesQuery;
  const eligible = (allProfiles || []).filter((p: any) => !excludedIds.has(p.id));
  if (eligible.length === 0) {
    return { me: myProfile ? { avatar_url: myProfile.avatar_url, username: myProfile.username } : null, matches: [] as DiscoverMatchCandidate[] };
  }

  const userIds = eligible.map((p: any) => p.id);
  const { data: allTrading } = await supabase.from("trading_profiles").select(tradingFields).in("user_id", userIds);
  const tradingMap = new Map<string, any>();
  (allTrading || []).forEach((t: any) => tradingMap.set(t.user_id, t));

  const myReach = myTrading?.connection_reach;
  const matches: DiscoverMatchCandidate[] = eligible
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
        city: p.city,
        state: p.state,
        country: p.country,
        markets: t?.markets || [],
        trading_style: t?.trading_style || [],
        experience_level: t?.experience_level || null,
        sessions: t?.sessions || [],
        matchPct: Math.min(result.pct + locationBonus, 100),
        created_at: p.created_at,
      };
    })
    .filter((c: DiscoverMatchCandidate | null): c is DiscoverMatchCandidate => c !== null)
    .filter((c: DiscoverMatchCandidate) => {
      if (myReach === "Local" && myProfile?.country) {
        return c.country && c.country.toLowerCase() === myProfile.country.toLowerCase();
      }
      return true;
    })
    .sort((a, b) => b.matchPct - a.matchPct);

  return { me: myProfile ? { avatar_url: myProfile.avatar_url, username: myProfile.username } : null, matches };
};