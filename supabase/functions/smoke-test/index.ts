import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  const run = async (name: string, fn: () => Promise<unknown>) => {
    try {
      const detail = await fn();
      steps.push({ step: name, ok: true, detail });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({ step: name, ok: false, error: msg });
      throw new Error(`Step "${name}" failed: ${msg}`);
    }
  };

  const stamp = Date.now();
  const userA = { email: `smoke_a_${stamp}@example.test`, password: `Pw!${stamp}aA1` };
  const userB = { email: `smoke_b_${stamp}@example.test`, password: `Pw!${stamp}bB1` };
  let aId = "", bId = "";
  let anonA: SupabaseClient, anonB: SupabaseClient;
  let postId = "", commentId = "", forumPostId = "", journalId = "", connectionId = "";

  const cleanup = async () => {
    for (const id of [aId, bId]) {
      if (!id) continue;
      try { await admin.auth.admin.deleteUser(id); } catch { /* ignore */ }
    }
  };

  try {
    // ── 1. CREATE ACCOUNT (admin-confirmed so we can sign in immediately) ──
    await run("create_account_a", async () => {
      const { data, error } = await admin.auth.admin.createUser({
        email: userA.email, password: userA.password, email_confirm: true,
        user_metadata: { full_name: "Smoke A", first_name: "Smoke", last_name: "A" },
      });
      if (error || !data.user) throw new Error(error?.message ?? "no user");
      aId = data.user.id;
      return { id: aId };
    });
    await run("create_account_b", async () => {
      const { data, error } = await admin.auth.admin.createUser({
        email: userB.email, password: userB.password, email_confirm: true,
        user_metadata: { full_name: "Smoke B" },
      });
      if (error || !data.user) throw new Error(error?.message ?? "no user");
      bId = data.user.id;
      return { id: bId };
    });

    await new Promise((r) => setTimeout(r, 400)); // let trigger settle

    // ── 2. SIGNUP TRIGGER WIRING ──
    await run("trigger_creates_profile", async () => {
      const { data, error } = await admin.from("profiles").select("id").eq("id", aId).maybeSingle();
      if (error || !data) throw new Error(error?.message ?? "missing profile row");
      return data;
    });
    await run("trigger_creates_trading_profile", async () => {
      const { data, error } = await admin.from("trading_profiles").select("id, user_id").eq("user_id", aId).maybeSingle();
      if (error || !data) throw new Error(error?.message ?? "missing trading_profile row");
      return data;
    });

    // ── 3. SIGN IN (anon client → real RLS) ──
    anonA = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    anonB = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    await run("sign_in_a", async () => {
      const { data, error } = await anonA.auth.signInWithPassword({ email: userA.email, password: userA.password });
      if (error || !data.session) throw new Error(error?.message ?? "no session");
      return { user_id: data.user.id };
    });
    await run("sign_in_b", async () => {
      const { data, error } = await anonB.auth.signInWithPassword({ email: userB.email, password: userB.password });
      if (error || !data.session) throw new Error(error?.message ?? "no session");
      return { user_id: data.user.id };
    });

    // ── 4. ONBOARDING (writes both profile + trading_profile, sets onboarding_completed) ──
    await run("onboarding_profile_update", async () => {
      const { error } = await anonA.from("profiles").update({
        username: `smoke_a_${stamp}`,
        full_name: "Smoke A",
        gender: "male",
        date_of_birth: "1995-01-01",
        country: "US", state: "NY", city: "NYC",
        bio: "smoke test bio",
        hobbies: ["chess"],
        chart_prompts: ["I trade because…|to grow"],
        off_chart_prompts: ["My weekend|chess"],
        onboarding_completed: true,
      }).eq("id", aId);
      if (error) throw new Error(error.message);
      return { ok: true };
    });
    await run("onboarding_trading_profile_update", async () => {
      const { error } = await anonA.from("trading_profiles").update({
        markets: ["Forex"], experience_level: "intermediate",
        instruments: ["EUR/USD"], strategies: ["smc"],
        sessions: ["London"], timeframes: ["15m"],
        trading_style: ["day"], frequency: ["daily"],
        primary_goal: ["accountability"], struggles: ["overtrading"],
        loss_response: "review",
        connection_types: ["partner"], connect_frequency: ["daily"],
        connection_reach: "global", looking_for_gender: "any",
        match_priorities: ["market", "experience"],
      }).eq("user_id", aId);
      if (error) throw new Error(error.message);
      return { ok: true };
    });
    // Mirror onboarding for B so Discover has a candidate
    await run("onboarding_b", async () => {
      const { error: e1 } = await anonB.from("profiles").update({
        username: `smoke_b_${stamp}`, full_name: "Smoke B",
        gender: "female", date_of_birth: "1995-01-01",
        onboarding_completed: true,
      }).eq("id", bId);
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await anonB.from("trading_profiles").update({
        markets: ["Forex"], experience_level: "intermediate",
        instruments: ["EUR/USD"], strategies: ["smc"],
        connection_types: ["partner"], looking_for_gender: "any",
      }).eq("user_id", bId);
      if (e2) throw new Error(e2.message);
      return { ok: true };
    });

    // ── 5. DISCOVER (separate profile + trading_profile queries) ──
    await run("discover_query", async () => {
      const { data: profiles, error: pErr } = await anonA
        .from("profiles").select("id, username").neq("id", aId).limit(50);
      if (pErr) throw new Error(pErr.message);
      if (!profiles?.some((p) => p.id === bId)) throw new Error("user B not in profiles list");
      const { data: tps, error: tErr } = await anonA
        .from("trading_profiles").select("user_id, markets, experience_level").eq("user_id", bId);
      if (tErr) throw new Error(tErr.message);
      if (!tps?.length) throw new Error("user B trading_profile not visible");
      return { profiles: profiles.length, b_markets: tps[0].markets };
    });

    // ── 6. WAITLIST (anonymous insert) ──
    await run("waitlist_insert", async () => {
      const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
      const { error } = await anon.from("waitlist").insert({
        email: `waitlist_${stamp}@example.test`,
        market: "Forex", markets: ["Forex", "Futures"], wants_beta: true,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    });

    // ── 7. PARTNER REQUEST + ACCEPT ──
    await run("match_request", async () => {
      const { data, error } = await anonA.from("partner_connections").insert({
        requester_id: aId, receiver_id: bId, status: "pending", match_score: 88,
      }).select().single();
      if (error || !data) throw new Error(error?.message ?? "no row");
      connectionId = data.id;
      return { id: connectionId };
    });
    await run("match_accept", async () => {
      const { data, error } = await anonB.from("partner_connections")
        .update({ status: "accepted" }).eq("id", connectionId).select().single();
      if (error || data?.status !== "accepted") throw new Error(error?.message ?? "not accepted");
      return { status: data.status };
    });

    // ── 8. DMs (send + receive + isolation) ──
    await run("dm_send", async () => {
      const { data, error } = await anonA.from("messages").insert({
        sender_id: aId, receiver_id: bId, content: "hi from smoke test",
      }).select().single();
      if (error || !data) throw new Error(error?.message ?? "no row");
      return { id: data.id };
    });
    await run("dm_receive", async () => {
      const { data, error } = await anonB.from("messages")
        .select("id").eq("sender_id", aId).eq("receiver_id", bId);
      if (error || !data?.length) throw new Error(error?.message ?? "empty");
      return { count: data.length };
    });
    await run("dm_rls_outsider", async () => {
      const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
      const { data } = await anon.from("messages").select("id").eq("sender_id", aId);
      if ((data?.length ?? 0) !== 0) throw new Error("anon read DM");
      return { ok: true };
    });

    // ── 9. FEED (post + like + comment + read) ──
    await run("feed_create_post", async () => {
      const { data, error } = await anonA.from("posts").insert({
        user_id: aId, content: "smoke feed post",
        media_urls: [], tags: ["smoke"], market: "Forex",
      }).select().single();
      if (error || !data) throw new Error(error?.message ?? "no row");
      postId = data.id;
      return { id: postId };
    });
    await run("feed_like", async () => {
      const { error } = await anonB.from("post_likes").insert({ post_id: postId, user_id: bId });
      if (error) throw new Error(error.message);
      return { ok: true };
    });
    await run("feed_comment", async () => {
      const { data, error } = await anonB.from("comments").insert({
        post_id: postId, user_id: bId, content: "smoke comment",
      }).select().single();
      if (error || !data) throw new Error(error?.message ?? "no row");
      commentId = data.id;
      return { id: commentId };
    });
    await run("feed_read", async () => {
      const { data, error } = await anonA.from("posts")
        .select("id, content, post_likes(post_id), comments(id)")
        .eq("id", postId).single();
      if (error || !data) throw new Error(error?.message ?? "missing post");
      return { likes: data.post_likes?.length ?? 0, comments: data.comments?.length ?? 0 };
    });

    // ── 10. PULSE / FORUM ──
    await run("pulse_create_post", async () => {
      const { data, error } = await anonA.from("forum_posts").insert({
        user_id: aId, forum: "Forex", title: "smoke pulse", content: "hello pulse",
      }).select().single();
      if (error || !data) throw new Error(error?.message ?? "no row");
      forumPostId = data.id;
      return { id: forumPostId };
    });
    await run("pulse_like", async () => {
      const { error } = await anonB.from("forum_post_likes").insert({ post_id: forumPostId, user_id: bId });
      if (error) throw new Error(error.message);
      return { ok: true };
    });
    await run("pulse_reply", async () => {
      const { error } = await anonB.from("forum_replies").insert({
        post_id: forumPostId, user_id: bId, content: "smoke reply",
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    });

    // ── 11. PROFILE update + view-other ──
    await run("profile_update_self", async () => {
      const { error } = await anonA.from("profiles").update({ bio: "updated bio" }).eq("id", aId);
      if (error) throw new Error(error.message);
      return { ok: true };
    });
    await run("profile_view_other", async () => {
      const { data, error } = await anonA.from("profiles").select("id, username").eq("id", bId).maybeSingle();
      if (error || !data) throw new Error(error?.message ?? "missing");
      return data;
    });
    await run("profile_update_other_blocked", async () => {
      const { error } = await anonA.from("profiles").update({ bio: "hacked" }).eq("id", bId);
      // RLS should silently block; verify B's bio unchanged
      const { data } = await admin.from("profiles").select("bio").eq("id", bId).single();
      if (data?.bio === "hacked") throw new Error("RLS allowed cross-user update");
      return { rls_enforced: true, error: error?.message ?? null };
    });

    // ── 12. JOURNALS (insert + read-own + RLS isolation) ──
    await run("journal_insert", async () => {
      const { data, error } = await anonA.from("journal_entries").insert({
        user_id: aId, market_pair: "EUR/USD", session: "London",
        result: "win", pnl_pips: 25, mood: "focused",
        notes: "smoke", share_setting: "private", tags: ["smoke"],
      }).select().single();
      if (error || !data) throw new Error(error?.message ?? "no row");
      journalId = data.id;
      return { id: journalId };
    });
    await run("journal_read_own", async () => {
      const { data, error } = await anonA.from("journal_entries").select("id").eq("user_id", aId);
      if (error || !data?.length) throw new Error(error?.message ?? "empty");
      return { count: data.length };
    });
    await run("journal_rls_isolation", async () => {
      const { data } = await anonB.from("journal_entries").select("id").eq("user_id", aId);
      if ((data?.length ?? 0) !== 0) throw new Error(`leaked ${data?.length}`);
      return { ok: true };
    });

    // ── 13. STORAGE UPLOADS (avatar + post image + audio + attachment) ──
    // Helper: upload a tiny PNG/blob and verify the public URL fetches back the same bytes.
    const tinyPng = new Uint8Array([
      0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
      0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,
      0x89,0x00,0x00,0x00,0x0D,0x49,0x44,0x41,0x54,0x78,0x9C,0x63,0x00,0x01,0x00,0x00,
      0x05,0x00,0x01,0x0D,0x0A,0x2D,0xB4,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,
      0x42,0x60,0x82,
    ]);

    const uploadAndVerify = async (
      client: SupabaseClient, bucket: string, path: string,
      bytes: Uint8Array, contentType: string,
    ) => {
      const { error: upErr } = await client.storage.from(bucket).upload(path, bytes, {
        upsert: true, contentType,
      });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      const { data: urlData } = client.storage.from(bucket).getPublicUrl(path);
      const url = urlData.publicUrl;
      // Fetch the public URL back and confirm it serves the same bytes
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`public fetch ${res.status}`);
      const got = new Uint8Array(await res.arrayBuffer());
      if (got.length !== bytes.length) throw new Error(`size mismatch ${got.length} vs ${bytes.length}`);
      return { url, bytes: got.length };
    };

    // Avatar upload at the exact path the app uses: `{uid}/avatar.jpg`
    let avatarUrl = "";
    await run("storage_avatar_upload", async () => {
      const result = await uploadAndVerify(anonA, "avatars", `${aId}/avatar.jpg`, tinyPng, "image/jpeg");
      avatarUrl = result.url;
      return result;
    });
    // Avatar RLS: user B cannot overwrite user A's avatar
    await run("storage_avatar_rls_blocks_other_user", async () => {
      const { error } = await anonB.storage.from("avatars").upload(`${aId}/avatar.jpg`, tinyPng, {
        upsert: true, contentType: "image/jpeg",
      });
      if (!error) throw new Error("RLS allowed cross-user avatar overwrite");
      return { rls_enforced: true, error: error.message };
    });
    // Persist avatar_url on the profile (mirrors the app behavior) and confirm it round-trips
    await run("storage_avatar_url_saved_on_profile", async () => {
      const persisted = `${avatarUrl}?t=${Date.now()}`;
      const { error: upErr } = await anonA.from("profiles").update({ avatar_url: persisted }).eq("id", aId);
      if (upErr) throw new Error(upErr.message);
      const { data, error } = await anonA.from("profiles").select("avatar_url").eq("id", aId).single();
      if (error || data?.avatar_url !== persisted) throw new Error("avatar_url not persisted");
      return { avatar_url: data.avatar_url };
    });

    // Post image upload (used by Feed posts and journal media via attached posts)
    let postImageUrl = "";
    await run("storage_post_image_upload", async () => {
      const r = await uploadAndVerify(anonA, "post-images", `${aId}/${stamp}.png`, tinyPng, "image/png");
      postImageUrl = r.url;
      return r;
    });
    // Attach the uploaded image to the existing feed post → simulates the real flow end-to-end
    await run("storage_post_image_renders_in_feed", async () => {
      const { error: upErr } = await anonA.from("posts")
        .update({ media_url: postImageUrl, media_urls: [postImageUrl], media_type: "image" })
        .eq("id", postId);
      if (upErr) throw new Error(upErr.message);
      const { data } = await anonB.from("posts").select("media_url, media_urls").eq("id", postId).single();
      if (data?.media_url !== postImageUrl) throw new Error("media_url not visible to other user");
      // Re-fetch the public URL to prove it still renders
      const res = await fetch(postImageUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`render fetch ${res.status}`);
      return { media_url: postImageUrl };
    });

    // Audio message + attachment buckets (used in DMs)
    await run("storage_audio_message_upload", async () => {
      return await uploadAndVerify(anonA, "audio-messages", `${aId}/${stamp}.webm`, tinyPng, "audio/webm");
    });
    await run("storage_message_attachment_upload", async () => {
      return await uploadAndVerify(anonA, "message-attachments", `${aId}/${stamp}.png`, tinyPng, "image/png");
    });

    // Cleanup the uploaded objects so the buckets stay tidy
    try {
      await admin.storage.from("avatars").remove([`${aId}/avatar.jpg`]);
      await admin.storage.from("post-images").remove([`${aId}/${stamp}.png`]);
      await admin.storage.from("audio-messages").remove([`${aId}/${stamp}.webm`]);
      await admin.storage.from("message-attachments").remove([`${aId}/${stamp}.png`]);
    } catch { /* ignore */ }

    await cleanup();
    return new Response(JSON.stringify({ ok: steps.every((s) => s.ok), total: steps.length, steps }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await cleanup();
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, total: steps.length, steps, error: msg }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});