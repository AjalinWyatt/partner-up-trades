// Weekly partner recap + at-risk streak check.
// Cron modes:
//   ?mode=recap      → Sunday weekly summary (system DM + email)
//   ?mode=atrisk     → Daily check for at-risk partner check-in streaks
//   default          → recap

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

type Profile = { id: string; username: string | null; full_name: string | null };
type Entry = { user_id: string; result: string | null; tags: string[] | null; created_at: string };

function fmtName(p?: Profile) {
  if (!p) return "@trader";
  return p.username ? `@${p.username}` : (p.full_name || "@trader");
}

function startOfWeekUTC(now: Date) {
  // Last Monday 00:00 UTC
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  const offset = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - offset - 7); // last week's Monday
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "recap";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: connections } = await supabase
    .from("partner_connections")
    .select("requester_id, receiver_id")
    .eq("status", "accepted");

  if (!connections?.length) {
    return new Response(JSON.stringify({ ok: true, partnerships: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = [...new Set(connections.flatMap((c) => [c.requester_id, c.receiver_id]))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .in("id", userIds);
  const profileMap = new Map<string, Profile>((profiles || []).map((p) => [p.id, p as Profile]));

  // ============ AT-RISK MODE ============
  if (mode === "atrisk") {
    let warned = 0;
    const today = new Date().toISOString().slice(0, 10);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    for (const c of connections) {
      const { data: streakData } = await supabase.rpc("get_partner_checkin_streak", {
        user_a: c.requester_id,
        user_b: c.receiver_id,
      });
      const streak = (streakData as number) || 0;
      if (streak < 2) continue; // only warn if there's a real streak to lose

      // Did they exchange today?
      const { count: aToday } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", c.requester_id).eq("receiver_id", c.receiver_id)
        .gte("created_at", today + "T00:00:00Z");
      const { count: bToday } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", c.receiver_id).eq("receiver_id", c.requester_id)
        .gte("created_at", today + "T00:00:00Z");
      if ((aToday || 0) > 0 && (bToday || 0) > 0) continue;

      for (const [me, them] of [[c.requester_id, c.receiver_id], [c.receiver_id, c.requester_id]]) {
        // 24h dedupe
        const { count: dup } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", me).eq("type", "streak_warning")
          .eq("related_user_id", them)
          .gte("created_at", since24h);
        if ((dup || 0) > 0) continue;

        const partner = profileMap.get(them);
        await supabase.from("notifications").insert({
          user_id: me,
          actor_id: them,
          related_user_id: them,
          type: "streak_warning",
          title: `🔥 ${streak}-day streak at risk`,
          body: `Check in with ${fmtName(partner)} today to keep it alive.`,
        });
        warned++;
      }
    }
    return new Response(JSON.stringify({ ok: true, mode, warned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ============ WEEKLY RECAP ============
  const now = new Date();
  const weekStart = startOfWeekUTC(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("user_id, result, tags, created_at")
    .in("user_id", userIds)
    .gte("created_at", weekStartISO)
    .lt("created_at", weekEndISO);

  const entriesByUser = new Map<string, Entry[]>();
  for (const e of (entries || []) as Entry[]) {
    const arr = entriesByUser.get(e.user_id) || [];
    arr.push(e); entriesByUser.set(e.user_id, arr);
  }

  function statsFor(uid: string) {
    const es = entriesByUser.get(uid) || [];
    const wins = es.filter((e) => (e.result || "").toLowerCase() === "win").length;
    const decided = es.filter((e) => ["win", "loss"].includes((e.result || "").toLowerCase())).length;
    const tagCounts: Record<string, number> = {};
    for (const e of es) for (const t of e.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
    return {
      logged: es.length,
      winRate: decided > 0 ? Math.round((wins / decided) * 100) : null,
      topTags,
    };
  }

  let sent = 0;
  for (const c of connections) {
    const a = profileMap.get(c.requester_id);
    const b = profileMap.get(c.receiver_id);
    if (!a || !b) continue;

    const { data: streakData } = await supabase.rpc("get_partner_checkin_streak", {
      user_a: c.requester_id, user_b: c.receiver_id,
    });
    const streak = (streakData as number) || 0;

    const { count: msgCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .or(
        `and(sender_id.eq.${c.requester_id},receiver_id.eq.${c.receiver_id}),` +
        `and(sender_id.eq.${c.receiver_id},receiver_id.eq.${c.requester_id})`,
      )
      .gte("created_at", weekStartISO).lt("created_at", weekEndISO);

    const sA = statsFor(c.requester_id);
    const sB = statsFor(c.receiver_id);

    function recapText(self: Profile, other: Profile, sSelf: ReturnType<typeof statsFor>, sOther: ReturnType<typeof statsFor>) {
      const lines = [
        `📊 Weekly recap — you & ${fmtName(other)}`,
        ``,
        `🤝 Partner streak: ${streak} day${streak === 1 ? "" : "s"}`,
        `💬 Messages this week: ${msgCount || 0}`,
        ``,
        `${fmtName(self)} (you)`,
        `  • Trades logged: ${sSelf.logged}`,
        `  • Win rate: ${sSelf.winRate == null ? "—" : sSelf.winRate + "%"}`,
        sSelf.topTags.length ? `  • Top tags: ${sSelf.topTags.join(", ")}` : null,
        ``,
        `${fmtName(other)}`,
        `  • Trades logged: ${sOther.logged}`,
        `  • Win rate: ${sOther.winRate == null ? "—" : sOther.winRate + "%"}`,
        sOther.topTags.length ? `  • Top tags: ${sOther.topTags.join(", ")}` : null,
        ``,
        `Keep it going next week. 🚀`,
      ].filter(Boolean);
      return lines.join("\n");
    }

    const textForA = recapText(a, b, sA, sB);
    const textForB = recapText(b, a, sB, sA);

    // System DM to each partner
    const { error: e1 } = await supabase.from("messages").insert([
      { sender_id: SYSTEM_USER_ID, receiver_id: a.id, content: textForA },
      { sender_id: SYSTEM_USER_ID, receiver_id: b.id, content: textForB },
    ]);
    if (!e1) sent += 2;
  }

  return new Response(JSON.stringify({ ok: true, mode, partnerships: connections.length, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});