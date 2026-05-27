import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 5 fake personas — they post on the feed and interact with each other,
// but are flagged hidden_from_discover so they never show up in matches.
const personas = [
  {
    email: "kai.london.fakefeed+tradersworld@gmail.com",
    username: "KaiLondonFX",
    full_name: "Kai Whitman",
    gender: "Male",
    bio: "London open scalper. Sharing the journey.",
    city: "London", state: null, country: "United Kingdom",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    posts: [
      {
        market: "Forex",
        tags: ["London session", "Scalping"],
        caption: "Clean London open today. Patience paid off — waited for the sweep then sent it.",
        media: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&h=1080&fit=crop",
      },
      {
        market: "Forex",
        tags: ["Mindset"],
        caption: "Best trade I took this week was the one I skipped. Discipline > prediction.",
        media: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1080&h=1080&fit=crop",
      },
    ],
  },
  {
    email: "ava.futures.fakefeed+tradersworld@gmail.com",
    username: "AvaFutures",
    full_name: "Ava Lin",
    gender: "Female",
    bio: "NQ + ES day trader. Process over PnL.",
    city: "Chicago", state: "Illinois", country: "United States",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    posts: [
      {
        market: "Futures",
        tags: ["NQ", "Day trading"],
        caption: "NQ gave a textbook ORB retest. Took 1R, walked away. TradersWorld accountability hits different.",
        media: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&h=1080&fit=crop",
      },
    ],
  },
  {
    email: "marcus.options.fakefeed+tradersworld@gmail.com",
    username: "MarcusOptions",
    full_name: "Marcus Reid",
    gender: "Male",
    bio: "Options flow + theta plays. Long-term focused.",
    city: "New York", state: "New York", country: "United States",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    posts: [
      {
        market: "Options",
        tags: ["Theta", "Earnings"],
        caption: "Credit spreads on SPY through CPI. Sized small, slept fine. That's the whole game.",
        media: "https://images.unsplash.com/photo-1554260570-9140fd3b7614?w=1080&h=1080&fit=crop",
      },
      {
        market: "Options",
        tags: ["Journal"],
        caption: "Journaling every trade for 30 days straight. The pattern in my losers is brutal but useful.",
        media: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1080&h=1080&fit=crop",
      },
    ],
  },
  {
    email: "zoe.pips.fakefeed+tradersworld@gmail.com",
    username: "ZoePips",
    full_name: "Zoe Hart",
    gender: "Female",
    bio: "Gold + majors. Building toward funded.",
    city: "Sydney", state: "New South Wales", country: "Australia",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    posts: [
      {
        market: "Forex",
        tags: ["Gold", "Asian session"],
        caption: "Asian session range break on XAU. Tiny size while I rebuild confidence. Slow is fast.",
        media: "https://images.unsplash.com/photo-1605792657660-596af9009e82?w=1080&h=1080&fit=crop",
      },
    ],
  },
  {
    email: "diego.swing.fakefeed+tradersworld@gmail.com",
    username: "DiegoSwing",
    full_name: "Diego Alvarez",
    gender: "Male",
    bio: "Swing trader. Weekly bias, daily entries.",
    city: "Madrid", state: null, country: "Spain",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop",
    posts: [
      {
        market: "Futures",
        tags: ["Swing", "Weekly"],
        caption: "Held my CL short over the weekend. Plan said hold, so I held. Up nicely on the Monday gap.",
        media: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop",
      },
    ],
  },
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require admin role to run this.
  const { data: roleRow } = await admin
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  const personaIds: { id: string; posts: string[] }[] = [];

  // 1) Create / refresh each persona and their posts
  for (const p of personas) {
    let userId: string | null = null;

    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = existing?.users?.find((u) => u.email?.toLowerCase() === p.email.toLowerCase());
    if (found) {
      userId = found.id;
      await admin.auth.admin.updateUserById(found.id, {
        email_confirm: true,
        user_metadata: { username: p.username, full_name: p.full_name },
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: p.email,
        password: crypto.randomUUID() + "Aa1!",
        email_confirm: true,
        user_metadata: { username: p.username, full_name: p.full_name },
      });
      if (createErr || !created.user) {
        results.push({ email: p.email, status: "failed", reason: createErr?.message });
        continue;
      }
      userId = created.user.id;
    }

    await admin.from("profiles").upsert({
      id: userId,
      username: p.username,
      full_name: p.full_name,
      avatar_url: p.avatar,
      gender: p.gender,
      bio: p.bio,
      city: p.city,
      state: p.state,
      country: p.country,
      onboarding_completed: true,
      hidden_from_discover: true,
      updated_at: new Date().toISOString(),
    });

    // Ensure they have a (minimal) trading profile so any fallback queries don't break.
    await admin.from("trading_profiles").upsert(
      { user_id: userId, markets: [p.posts[0].market], updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    // Create their posts (skip ones already created for this user with same caption)
    const postIds: string[] = [];
    for (const post of p.posts) {
      const { data: existingPost } = await admin
        .from("posts").select("id").eq("user_id", userId).eq("caption", post.caption).maybeSingle();
      if (existingPost) { postIds.push(existingPost.id); continue; }

      const { data: inserted, error: postErr } = await admin.from("posts").insert({
        user_id: userId,
        caption: post.caption,
        media_url: post.media,
        media_urls: [post.media],
        media_type: "image",
        image_url: post.media,
        market: post.market,
        tags: post.tags,
        share_to_feed: true,
      }).select("id").single();
      if (postErr) { results.push({ user: p.username, post_error: postErr.message }); continue; }
      postIds.push(inserted.id);
    }

    personaIds.push({ id: userId!, posts: postIds });
    results.push({ username: p.username, user_id: userId, posts: postIds.length });
  }

  // 2) Have each persona like and comment on every other persona's posts
  let likeCount = 0, commentCount = 0;
  for (let i = 0; i < personaIds.length; i++) {
    for (let j = 0; j < personaIds.length; j++) {
      if (i === j) continue;
      for (const postId of personaIds[j].posts) {
        // Like (idempotent: skip if exists)
        const { data: hasLike } = await admin.from("post_likes")
          .select("id").eq("post_id", postId).eq("user_id", personaIds[i].id).maybeSingle();
        if (!hasLike) {
          const { error } = await admin.from("post_likes").insert({ post_id: postId, user_id: personaIds[i].id });
          if (!error) likeCount++;
        }

        // Comment (one per (commenter, post) pair, idempotent)
        const text = fakeComments[(i * 7 + j * 3 + postId.charCodeAt(0)) % fakeComments.length];
        const { data: hasComment } = await admin.from("comments")
          .select("id").eq("post_id", postId).eq("user_id", personaIds[i].id).eq("content", text).maybeSingle();
        if (!hasComment) {
          const { error } = await admin.from("comments").insert({
            post_id: postId, user_id: personaIds[i].id, content: text,
          });
          if (!error) commentCount++;
        }
      }
    }
  }

  return new Response(JSON.stringify({
    ok: true, personas: results, likes_added: likeCount, comments_added: commentCount,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});