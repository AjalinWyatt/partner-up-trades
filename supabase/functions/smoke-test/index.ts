import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Step = { step: string; ok: boolean; detail?: unknown; error?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const steps: Step[] = [];
  const push = (s: Step) => { steps.push(s); return s; };

  // Two fresh users (sender + receiver for DM)
  const stamp = Date.now();
  const userA = { email: `smoke_a_${stamp}@example.test`, password: `Pw!${stamp}aA1` };
  const userB = { email: `smoke_b_${stamp}@example.test`, password: `Pw!${stamp}bB1` };
  let userAId = "";
  let userBId = "";

  const cleanup = async () => {
    for (const id of [userAId, userBId]) {
      if (!id) continue;
      try { await admin.auth.admin.deleteUser(id); } catch { /* ignore */ }
    }
  };

  try {
    // ─────────────────────────────────────────────────────
    // 1. Sign up user A (auto-confirm via admin so we get a session)
    // ─────────────────────────────────────────────────────
    {
      const { data, error } = await admin.auth.admin.createUser({
        email: userA.email,
        password: userA.password,
        email_confirm: true,
        user_metadata: { full_name: "Smoke A", first_name: "Smoke", last_name: "A" },
      });
      if (error || !data.user) throw push({ step: "signup_user_a", ok: false, error: error?.message });
      userAId = data.user.id;
      push({ step: "signup_user_a", ok: true, detail: { id: userAId } });
    }

    // 2. Sign up user B
    {
      const { data, error } = await admin.auth.admin.createUser({
        email: userB.email,
        password: userB.password,
        email_confirm: true,
        user_metadata: { full_name: "Smoke B" },
      });
      if (error || !data.user) throw push({ step: "signup_user_b", ok: false, error: error?.message });
      userBId = data.user.id;
      push({ step: "signup_user_b", ok: true, detail: { id: userBId } });
    }

    // Allow trigger to settle (handle_new_user runs synchronously but be safe)
    await new Promise((r) => setTimeout(r, 400));

    // 3. Verify profiles row was auto-created by trigger
    {
      const { data, error } = await admin.from("profiles").select("id, username").eq("id", userAId).maybeSingle();
      if (error || !data) throw push({ step: "profile_auto_created", ok: false, error: error?.message ?? "no row" });
      push({ step: "profile_auto_created", ok: true, detail: data });
    }

    // 4. Verify trading_profiles row was auto-created by trigger
    {
      const { data, error } = await admin.from("trading_profiles").select("id, user_id").eq("user_id", userAId).maybeSingle();
      if (error || !data) throw push({ step: "trading_profile_auto_created", ok: false, error: error?.message ?? "no row" });
      push({ step: "trading_profile_auto_created", ok: true, detail: data });
    }

    // 5. Sign in as user A using anon client → exercises RLS
    const anonA = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    {
      const { data, error } = await anonA.auth.signInWithPassword({ email: userA.email, password: userA.password });
      if (error || !data.session) throw push({ step: "signin_user_a", ok: false, error: error?.message });
      push({ step: "signin_user_a", ok: true });
    }

    // 6. Submit waitlist (anonymous-allowed insert with markets array)
    {
      const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
      const { error } = await anon.from("waitlist").insert({
        email: `waitlist_${stamp}@example.test`,
        market: "Forex",
        markets: ["Forex", "Futures"],
        wants_beta: true,
      });
      if (error) throw push({ step: "waitlist_insert", ok: false, error: error.message });
      push({ step: "waitlist_insert", ok: true });
    }

    // 7. Create journal entry as user A (RLS: auth.uid() = user_id)
    {
      const { data, error } = await anonA.from("journal_entries").insert({
        user_id: userAId,
        market_pair: "EUR/USD",
        session: "London",
        result: "win",
        pnl_pips: 25,
        mood: "focused",
        notes: "Smoke test entry",
        share_setting: "private",
        tags: ["smoke"],
      }).select().single();
      if (error || !data) throw push({ step: "journal_insert", ok: false, error: error?.message });
      push({ step: "journal_insert", ok: true, detail: { id: data.id } });
    }

    // 8. Read journal back as user A (should see own row)
    {
      const { data, error } = await anonA.from("journal_entries").select("id").eq("user_id", userAId);
      if (error || !data || data.length === 0) throw push({ step: "journal_read_own", ok: false, error: error?.message ?? "empty" });
      push({ step: "journal_read_own", ok: true, detail: { count: data.length } });
    }

    // 9. Verify journal RLS: user B cannot read user A's entries
    const anonB = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    {
      const sb = await anonB.auth.signInWithPassword({ email: userB.email, password: userB.password });
      if (sb.error) throw push({ step: "signin_user_b", ok: false, error: sb.error.message });
      const { data, error } = await anonB.from("journal_entries").select("id").eq("user_id", userAId);
      if (error) throw push({ step: "journal_rls_isolation", ok: false, error: error.message });
      if ((data?.length ?? 0) !== 0) throw push({ step: "journal_rls_isolation", ok: false, error: `leaked ${data?.length} rows` });
      push({ step: "journal_rls_isolation", ok: true });
    }

    // 10. Send DM from A → B
    {
      const { data, error } = await anonA.from("messages").insert({
        sender_id: userAId,
        receiver_id: userBId,
        content: "smoke test dm",
      }).select().single();
      if (error || !data) throw push({ step: "dm_send", ok: false, error: error?.message });
      push({ step: "dm_send", ok: true, detail: { id: data.id } });
    }

    // 11. User B reads DM (RLS: receiver can view)
    {
      const { data, error } = await anonB.from("messages")
        .select("id, content")
        .eq("sender_id", userAId)
        .eq("receiver_id", userBId);
      if (error || !data || data.length === 0) throw push({ step: "dm_receive", ok: false, error: error?.message ?? "empty" });
      push({ step: "dm_receive", ok: true, detail: { count: data.length } });
    }

    // 12. Outsider cannot read DM (anon, unauthenticated)
    {
      const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
      const { data } = await anon.from("messages").select("id").eq("sender_id", userAId);
      if ((data?.length ?? 0) !== 0) throw push({ step: "dm_rls_isolation", ok: false, error: "anon could read" });
      push({ step: "dm_rls_isolation", ok: true });
    }

    const allOk = steps.every((s) => s.ok);
    await cleanup();
    return new Response(JSON.stringify({ ok: allOk, steps }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await cleanup();
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, steps, error: msg }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});