// Edge function: admin-broadcast-dm
// Lets an admin send a custom DM from the TradersWorld system account
// to a filtered audience of users.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

type Filters = {
  markets?: string[];
  primary_goals?: string[];
  experience_levels?: string[];
  account_types?: string[];
  has_logged_trades?: boolean;
  partners_status?: "any" | "zero" | "has_partners";
  countries?: string[];
  onboarding_completed?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const message: string = String(body?.message || "").trim();
    const filters: Filters = body?.filters || {};
    const dryRun: boolean = !!body?.dryRun;
    const broadcastKey: string = String(body?.broadcastKey || "").trim();

    if (!dryRun) {
      if (!message) {
        return new Response(JSON.stringify({ error: "message_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (message.length > 4000) {
        return new Response(JSON.stringify({ error: "message_too_long" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!broadcastKey) {
        return new Response(JSON.stringify({ error: "broadcast_key_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Start from profiles
    let profileQuery = admin.from("profiles").select("id,country,onboarding_completed");
    if (filters.onboarding_completed !== undefined) {
      profileQuery = profileQuery.eq("onboarding_completed", filters.onboarding_completed);
    }
    if (filters.countries && filters.countries.length > 0) {
      profileQuery = profileQuery.in("country", filters.countries);
    }
    const { data: profiles, error: pErr } = await profileQuery.limit(50000);
    if (pErr) {
      return new Response(JSON.stringify({ error: "profile_query_failed", details: pErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let userIds = new Set((profiles ?? []).map((p: any) => p.id as string));

    const tpFilterActive =
      (filters.markets?.length ?? 0) > 0 ||
      (filters.primary_goals?.length ?? 0) > 0 ||
      (filters.experience_levels?.length ?? 0) > 0;
    if (tpFilterActive) {
      let tpQ = admin.from("trading_profiles").select("user_id,markets,primary_goal,experience_level").limit(50000);
      if (filters.markets?.length) tpQ = tpQ.overlaps("markets", filters.markets);
      if (filters.primary_goals?.length) tpQ = tpQ.overlaps("primary_goal", filters.primary_goals);
      if (filters.experience_levels?.length) tpQ = tpQ.in("experience_level", filters.experience_levels);
      const { data: tps, error: tpErr } = await tpQ;
      if (tpErr) {
        return new Response(JSON.stringify({ error: "tp_query_failed", details: tpErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const matched = new Set((tps ?? []).map((r: any) => r.user_id as string));
      userIds = new Set([...userIds].filter((id) => matched.has(id)));
    }

    if ((filters.account_types?.length ?? 0) > 0 || filters.has_logged_trades) {
      let jQ = admin.from("journal_entries").select("user_id,account_type").limit(100000);
      if (filters.account_types?.length) jQ = jQ.in("account_type", filters.account_types);
      const { data: js, error: jErr } = await jQ;
      if (jErr) {
        return new Response(JSON.stringify({ error: "journal_query_failed", details: jErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const matched = new Set((js ?? []).map((r: any) => r.user_id as string));
      userIds = new Set([...userIds].filter((id) => matched.has(id)));
    }

    if (filters.partners_status && filters.partners_status !== "any") {
      const { data: conns, error: cErr } = await admin
        .from("partner_connections")
        .select("requester_id,receiver_id,status")
        .eq("status", "accepted")
        .limit(100000);
      if (cErr) {
        return new Response(JSON.stringify({ error: "conn_query_failed", details: cErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const withPartners = new Set<string>();
      for (const c of conns ?? []) {
        withPartners.add((c as any).requester_id);
        withPartners.add((c as any).receiver_id);
      }
      if (filters.partners_status === "zero") {
        userIds = new Set([...userIds].filter((id) => !withPartners.has(id)));
      } else if (filters.partners_status === "has_partners") {
        userIds = new Set([...userIds].filter((id) => withPartners.has(id)));
      }
    }

    userIds.delete(SYSTEM_USER_ID);
    userIds.delete(callerId);

    const recipients = [...userIds];

    if (dryRun) {
      return new Response(
        JSON.stringify({ ok: true, dryRun: true, count: recipients.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dmKey = `broadcast:${broadcastKey}`;
    const { data: alreadySent } = await admin
      .from("system_dm_log")
      .select("user_id")
      .eq("dm_key", dmKey)
      .in("user_id", recipients);
    const alreadySentSet = new Set((alreadySent ?? []).map((r: any) => r.user_id as string));
    const toSend = recipients.filter((id) => !alreadySentSet.has(id));

    const chunk = <T,>(arr: T[], n: number) =>
      Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

    let sent = 0;
    let failed = 0;
    for (const batch of chunk(toSend, 500)) {
      const rows = batch.map((rid) => ({
        sender_id: SYSTEM_USER_ID,
        receiver_id: rid,
        content: message,
      }));
      const { error: insErr } = await admin.from("messages").insert(rows);
      if (insErr) {
        failed += batch.length;
        continue;
      }
      sent += batch.length;
      const logRows = batch.map((rid) => ({ user_id: rid, dm_key: dmKey }));
      await admin.from("system_dm_log").insert(logRows);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        audienceSize: recipients.length,
        skippedAlreadySent: alreadySentSet.size,
        sent,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "server_error", details: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});