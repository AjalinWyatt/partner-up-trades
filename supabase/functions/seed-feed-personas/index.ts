import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const personas = [
  { email: "kai.fakefeed+tw@gmail.com",    username: "kai_londonfx",  full_name: "Kai Whitman",   gender: "Male",   bio: "London open scalper. Sharing the journey.",       city: "London",   state: null,              country: "United Kingdom", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    posts: [
      { market: "Forex", tags: ["London session","Scalping"], caption: "Clean London open today. Patience paid off — waited for the sweep then sent it.", media: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&h=1080&fit=crop", ageHours: 6 },
      { market: "Forex", tags: ["Mindset"],                    caption: "Best trade I took this week was the one I skipped. Discipline > prediction.",        media: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1080&h=1080&fit=crop", ageHours: 48 },
    ] },
  { email: "ava.fakefeed+tw@gmail.com",    username: "ava_futures",   full_name: "Ava Lin",       gender: "Female", bio: "NQ + ES day trader. Process over PnL.",            city: "Chicago",  state: "Illinois",        country: "United States",  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    posts: [
      { market: "Futures", tags: ["NQ","Day trading"], caption: "NQ gave a textbook ORB retest. Took 1R, walked away. TradersWorld accountability hits different.", media: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&h=1080&fit=crop", ageHours: 10 },
    ] },
  { email: "marcus.fakefeed+tw@gmail.com", username: "marcus_options",full_name: "Marcus Reid",   gender: "Male",   bio: "Options flow + theta plays. Long-term focused.",   city: "New York", state: "New York",        country: "United States",  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    posts: [
      { market: "Options", tags: ["Theta","Earnings"], caption: "Credit spreads on SPY through CPI. Sized small, slept fine. That's the whole game.", media: "https://images.unsplash.com/photo-1554260570-9140fd3b7614?w=1080&h=1080&fit=crop", ageHours: 24 },
      { market: "Options", tags: ["Journal"],          caption: "Journaling every trade for 30 days straight. The pattern in my losers is brutal but useful.", media: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1080&h=1080&fit=crop", ageHours: 72 },
    ] },
  { email: "zoe.fakefeed+tw@gmail.com",    username: "zoe_pips",      full_name: "Zoe Hart",      gender: "Female", bio: "Gold + majors. Building toward funded.",            city: "Sydney",   state: "New South Wales", country: "Australia",      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    posts: [
      { market: "Forex", tags: ["Gold","Asian session"], caption: "Asian session range break on XAU. Tiny size while I rebuild confidence. Slow is fast.", media: "https://images.unsplash.com/photo-1605792657660-596af9009e82?w=1080&h=1080&fit=crop", ageHours: 4 },
    ] },
  { email: "diego.fakefeed+tw@gmail.com",  username: "diego_swing",   full_name: "Diego Alvarez", gender: "Male",   bio: "Swing trader. Weekly bias, daily entries.",         city: "Madrid",   state: null,              country: "Spain",          avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop",
    posts: [
      { market: "Futures", tags: ["Swing","Weekly"], caption: "Held my CL short over the weekend. Plan said hold, so I held. Up nicely on the Monday gap.", media: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop", ageHours: 18 },
    ] },
];

const fakeComments = [
  "This community is unreal. Love seeing real trades, not lambo bait.",
  "Saving this. The patience here is what I'm working on.",
  "Solid setup. Respect for sharing the process and not just the win.",
  "TradersWorld accountability is genuinely changing my routine.",
  "Clean entry. Walking away at 1R is the move most people skip.",
  "Needed to see this today. Back to the plan.",
  "This is the kind of post I joined for. Keep them coming.",
  "My partner and I review these together every morning. Huge value.",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const created: { id: string; posts: string[] }[] = [];
  const summary: any[] = [];

  const { data: existingAuth } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  for (const p of personas) {
    let userId: string;
    const found = existingAuth?.users?.find((u) => u.email?.toLowerCase() === p.email.toLowerCase());
    if (found) {
      userId = found.id;
    } else {
      const { data: c, error: e } = await admin.auth.admin.createUser({
        email: p.email, password: crypto.randomUUID() + "Aa1!", email_confirm: true,
        user_metadata: { username: p.username, full_name: p.full_name },
      });
      if (e || !c.user) { summary.push({ email: p.email, error: e?.message }); continue; }
      userId = c.user.id;
    }

    await admin.from("profiles").upsert({
      id: userId, username: p.username, full_name: p.full_name, avatar_url: p.avatar,
      gender: p.gender, bio: p.bio, city: p.city, state: p.state, country: p.country,
      onboarding_completed: true, hidden_from_discover: true, updated_at: new Date().toISOString(),
    });
    await admin.from("trading_profiles").upsert(
      { user_id: userId, markets: [p.posts[0].market], updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    const postIds: string[] = [];
    for (const post of p.posts) {
      const { data: ex } = await admin.from("posts").select("id").eq("user_id", userId).eq("caption", post.caption).maybeSingle();
      if (ex) { postIds.push(ex.id); continue; }
      const { data: ins, error: pe } = await admin.from("posts").insert({
        user_id: userId, caption: post.caption,
        media_url: post.media, media_urls: [post.media], image_url: post.media,
        media_type: "image", market: post.market, tags: post.tags, share_to_feed: true,
        created_at: new Date(Date.now() - post.ageHours * 3600_000).toISOString(),
      }).select("id").single();
      if (pe) { summary.push({ user: p.username, post_error: pe.message }); continue; }
      postIds.push(ins.id);
    }
    created.push({ id: userId, posts: postIds });
    summary.push({ username: p.username, user_id: userId, posts: postIds.length });
  }

  let likes = 0, comments = 0;
  for (let i = 0; i < created.length; i++) {
    for (let j = 0; j < created.length; j++) {
      if (i === j) continue;
      for (const postId of created[j].posts) {
        const { data: hl } = await admin.from("post_likes").select("id").eq("post_id", postId).eq("user_id", created[i].id).maybeSingle();
        if (!hl) {
          const { error } = await admin.from("post_likes").insert({ post_id: postId, user_id: created[i].id });
          if (!error) likes++;
        }
        const text = fakeComments[(i * 7 + j * 3 + postId.charCodeAt(0)) % fakeComments.length];
        const { data: hc } = await admin.from("comments").select("id").eq("post_id", postId).eq("user_id", created[i].id).eq("content", text).maybeSingle();
        if (!hc) {
          const { error } = await admin.from("comments").insert({ post_id: postId, user_id: created[i].id, content: text });
          if (!error) comments++;
        }
      }
    }
  }

  // Refresh cached like counts
  for (const c of created) {
    for (const postId of c.posts) {
      const { count } = await admin.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId);
      await admin.from("posts").update({ likes_count: count || 0 }).eq("id", postId);
    }
  }

  return new Response(JSON.stringify({ ok: true, summary, likes_added: likes, comments_added: comments }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});