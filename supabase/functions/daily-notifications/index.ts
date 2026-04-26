import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString();
  const todayStr = now.toISOString().slice(0, 10);

  // Helper: check if notification already sent within 24h
  async function alreadyNotified(userId: string, type: string, relatedUserId?: string) {
    let q = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", type)
      .gte("created_at", since24h);
    if (relatedUserId) q = q.eq("actor_id", relatedUserId);
    const { count } = await q;
    return (count || 0) > 0;
  }

  async function notify(userId: string, type: string, title: string, body: string, relatedUserId?: string) {
    if (await alreadyNotified(userId, type, relatedUserId)) return;
    await supabase.from("notifications").insert({
      user_id: userId,
      actor_id: relatedUserId || userId,
      type,
      title,
      body,
      read: false,
    });
  }

  // 1. Get all accepted partner connections
  const { data: connections } = await supabase
    .from("partner_connections")
    .select("requester_id, receiver_id")
    .eq("status", "accepted");

  const partnerPairs = (connections || []).map(c => [c.requester_id, c.receiver_id]);

  // 2. Get all user IDs involved in partnerships
  const allUserIds = [...new Set(partnerPairs.flat())];
  if (allUserIds.length === 0) {
    return new Response(JSON.stringify({ message: "No partnerships to check" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Get profiles for names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", allUserIds);
  const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name || "Your partner"]));

  // 4. Get recent journal entries (last 7 days) for all partnered users
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("user_id, created_at, result, mood")
    .in("user_id", allUserIds)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false });

  const entriesByUser = new Map<string, any[]>();
  for (const e of entries || []) {
    const list = entriesByUser.get(e.user_id) || [];
    list.push(e);
    entriesByUser.set(e.user_id, list);
  }

  // Process each partnership
  for (const [userA, userB] of partnerPairs) {
    for (const [userId, partnerId] of [[userA, userB], [userB, userA]]) {
      const partnerEntries = entriesByUser.get(partnerId) || [];
      const partnerName = profileMap.get(partnerId) || "Your partner";
      const lastEntry = partnerEntries[0];

      // partner_inactive: no entries in 2+ days
      if (!lastEntry || lastEntry.created_at < twoDaysAgo) {
        await notify(
          userId,
          "partner_inactive",
          `${partnerName} hasn't logged in 2 days`,
          "Send them a check-in message",
          partnerId
        );
      }

      // partner_support: 3+ consecutive Rough mood OR Loss result
      if (partnerEntries.length >= 3) {
        const last3 = partnerEntries.slice(0, 3);
        const allRough = last3.every(
          e => e.result === "Loss" || e.mood === "Rough" || e.mood === "rough"
        );
        if (allRough) {
          await notify(
            userId,
            "partner_support",
            `${partnerName} had 3 tough days in a row`,
            "They may need some support",
            partnerId
          );
        }
      }
    }
  }

  // 5. Streak checks for ALL users with entries
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("onboarding_completed", true);

  for (const profile of allProfiles || []) {
    const userEntries = entriesByUser.get(profile.id) || [];
    const loggedToday = userEntries.some(e => e.created_at.slice(0, 10) === todayStr);

    // Calculate streak (consecutive days before today)
    let streak = 0;
    const days = new Set(userEntries.map(e => e.created_at.slice(0, 10)));
    let d = new Date(now.getTime() - 86400000); // start from yesterday
    for (let i = 0; i < 30; i++) {
      if (days.has(d.toISOString().slice(0, 10))) {
        streak++;
        d = new Date(d.getTime() - 86400000);
      } else break;
    }

    // streak_warning: has 3+ day streak but hasn't logged today
    if (!loggedToday && streak >= 3) {
      await notify(
        profile.id,
        "streak_warning",
        "Don't lose your streak 🔥",
        `You haven't logged today. Keep your ${streak} day streak alive.`
      );
    }
  }

  // 6. new_match: check for recently onboarded users (last 24h) and notify high matches
  const { data: newUsers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("onboarding_completed", true)
    .gte("updated_at", since24h);

  if (newUsers && newUsers.length > 0) {
    for (const newUser of newUsers) {
      const { data: newTp } = await supabase
        .from("trading_profiles")
        .select("*")
        .eq("user_id", newUser.id)
        .maybeSingle();
      if (!newTp) continue;

      // Check against all other users
      const { data: otherTps } = await supabase
        .from("trading_profiles")
        .select("*")
        .neq("user_id", newUser.id);

      for (const otherTp of otherTps || []) {
        // Simple match calculation
        let score = 0, total = 0;
        const overlap = (a: string[], b: string[]) => a.filter(v => b.includes(v));

        total += 3;
        const mOv = overlap(newTp.markets || [], otherTp.markets || []);
        if (mOv.length > 0) score += 3 * (mOv.length / Math.max((newTp.markets || []).length, 1));

        total += 2;
        if (overlap(newTp.trading_style || [], otherTp.trading_style || []).length > 0) score += 2;

        total += 2;
        if (overlap(newTp.sessions || [], otherTp.sessions || []).length > 0) score += 2;

        total += 1;
        if (newTp.experience_level === otherTp.experience_level) score += 1;

        total += 2;
        if (overlap(newTp.strategies || [], otherTp.strategies || []).length > 0) score += 2;

        const pct = total > 0 ? Math.round((score / total) * 100) : 0;

        if (pct >= 70) {
          const newName = newUser.full_name || "A new trader";
          await notify(
            otherTp.user_id,
            "new_match",
            "New match available 🎯",
            `${newName} is a ${pct}% match with you`,
            newUser.id
          );
        }
      }
    }
  }

  // ===== Welcome / share DM from TradersWorld system account =====
  // Send 24h after signup, only if the user has nothing in their Discover
  // (no eligible candidate profiles to match with yet).
  try {
    const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";
    const WELCOME_DM_KEY = "welcome_share_v2";
    const WELCOME_DM_BODY = `Welcome to TradersWorld 👋🏽

We're actively growing the network, so matches may take a little time. Want to help speed it up?

Share TradersWorld on your socials and help bring more traders into the community. More traders = better matches for everyone.

Appreciate you being early 🙏🏾`;

    // Candidates: onboarded users who signed up >= 24h ago
    const { data: candidates } = await supabase
      .from("profiles")
      .select("id, created_at")
      .eq("onboarding_completed", true)
      .lte("created_at", since24h);

    if (candidates && candidates.length > 0) {
      const ids = candidates.map((c: any) => c.id);

      // Already-sent log
      const { data: alreadySent } = await supabase
        .from("system_dm_log")
        .select("user_id")
        .eq("dm_key", WELCOME_DM_KEY)
        .in("user_id", ids);
      const sentSet = new Set((alreadySent || []).map((r: any) => r.user_id));

      const targets = candidates.filter((c: any) => !sentSet.has(c.id));
      if (targets.length > 0) {
        // For Discover-empty check we need: total onboarded user count,
        // plus per-user excluded counts (connections/blocked/passed).
        const { count: onboardedCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("onboarding_completed", true);
        const totalOnboarded = onboardedCount || 0;

        for (const u of targets) {
          // Build excluded id set (self + all pending/accepted partners + blocked + passed)
          const excluded = new Set<string>([u.id]);
          const [{ data: conns }, { data: blocked }, { data: passed }] = await Promise.all([
            supabase
              .from("partner_connections")
              .select("requester_id, receiver_id")
              .or(`requester_id.eq.${u.id},receiver_id.eq.${u.id}`)
              .in("status", ["pending", "accepted"]),
            supabase.from("blocked_users").select("blocked_id").eq("blocker_id", u.id),
            supabase.from("passed_profiles").select("passed_id").eq("passer_id", u.id),
          ]);
          (conns || []).forEach((c: any) => { excluded.add(c.requester_id); excluded.add(c.receiver_id); });
          (blocked || []).forEach((b: any) => excluded.add(b.blocked_id));
          (passed || []).forEach((p: any) => excluded.add(p.passed_id));

          // Discover is empty if every onboarded user is excluded.
          const availableCount = totalOnboarded - excluded.size;
          if (availableCount > 0) continue; // they have matches to look at — no DM

          // Send the DM
          const { error: msgErr } = await supabase.from("messages").insert({
            sender_id: SYSTEM_USER_ID,
            receiver_id: u.id,
            content: WELCOME_DM_BODY,
          });
          if (msgErr) {
            console.error("welcome DM insert failed", u.id, msgErr.message);
            continue;
          }
          await supabase.from("system_dm_log").insert({
            user_id: u.id,
            dm_key: WELCOME_DM_KEY,
          });
        }
      }
    }
  } catch (e) {
    console.error("welcome DM batch failed", e);
  }

  return new Response(
    JSON.stringify({ message: "Daily checks completed", timestamp: now.toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
