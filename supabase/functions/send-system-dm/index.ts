// Edge function: send-system-dm
// Sends a DM from the official TradersWorld system account to the calling user.
// Uses the service role to bypass RLS / the system-message guardrails.
// Idempotent via the `system_dm_log` table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

// Allow-list of system DMs the client can request. The body lives server-side
// so a malicious client can't ask the system account to send arbitrary text.
const TEMPLATES: Record<string, string> = {
  welcome_no_partners_v1: `Welcome to TradersWorld! 👋

We're a brand new community working to bring traders together to find their accountability partners. Looks like you don't have any partners yet — would you mind sharing TradersWorld on your socials? It helps both you (more traders = better matches for you) and everyone else find their people here.

Even one post or story makes a real difference. Thank you for being an early member 🙏

— The TradersWorld team`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Identify the caller from their JWT
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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const dmKey = String(body?.dmKey || "");
    if (!TEMPLATES[dmKey]) {
      return new Response(
        JSON.stringify({ error: "unknown_dm_key" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Service-role client (bypasses RLS + message guardrails)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Already sent?
    const { data: existing } = await admin
      .from("system_dm_log")
      .select("id")
      .eq("user_id", userId)
      .eq("dm_key", dmKey)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, sent: false, reason: "already_sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: msgErr } = await admin.from("messages").insert({
      sender_id: SYSTEM_USER_ID,
      receiver_id: userId,
      content: TEMPLATES[dmKey],
    });
    if (msgErr) {
      return new Response(
        JSON.stringify({ error: "insert_failed", details: msgErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await admin.from("system_dm_log").insert({
      user_id: userId,
      dm_key: dmKey,
    });

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
