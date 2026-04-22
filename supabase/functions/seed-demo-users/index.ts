import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const demoUsers = [
  {
    email: "maya.fx.demo+tradersworld@gmail.com",
    password: "DemoTrader123!",
    username: "MayaFX",
    full_name: "Maya Brooks",
    gender: "Female",
    bio: "Forex day trader focused on London and New York session structure.",
    city: "Atlanta",
    state: "Georgia",
    country: "United States",
    hobbies: ["Fitness", "Travel", "Reading"],
    chart_prompts: ["Clean setups only", "Risk first"],
    off_chart_prompts: ["Coffee before charts"],
    trading: {
      markets: ["Forex"],
      sessions: ["London", "New York"],
      strategies: ["Price action", "Mixed"],
      trading_style: ["Day trader", "Scalper"],
      experience_level: "Building my edge",
      primary_goal: ["Get consistently profitable"],
      struggles: ["Overtrading", "Consistency"],
      looking_for_gender: "Female",
      connection_types: ["1-on-1 Partner"],
      instruments: ["Majors"],
      connection_reach: "Global",
    },
  },
  {
    email: "lena.london.demo+tradersworld@gmail.com",
    password: "DemoTrader123!",
    username: "LenaLondon",
    full_name: "Lena Hart",
    gender: "Female",
    bio: "Scalper looking for consistency and accountability.",
    city: "London",
    state: null,
    country: "United Kingdom",
    hobbies: ["Pilates", "Journaling", "Podcasts"],
    chart_prompts: ["Discipline over dopamine"],
    off_chart_prompts: ["Protect capital"],
    trading: {
      markets: ["Forex"],
      sessions: ["London", "Multiple / flexible"],
      strategies: ["Smart money / ICT", "Price action"],
      trading_style: ["Scalper", "Day trader"],
      experience_level: "Consistent & growing",
      primary_goal: ["Get consistently profitable", "Scale funded accounts"],
      struggles: ["Risk management", "Psychology"],
      looking_for_gender: "Female",
      connection_types: ["1-on-1 Partner"],
      instruments: ["Majors", "Gold"],
      connection_reach: "Global",
    },
  },
  {
    email: "nia.pips.demo+tradersworld@gmail.com",
    password: "DemoTrader123!",
    username: "NiaPips",
    full_name: "Nia Carter",
    gender: "Female",
    bio: "Forex trader building a repeatable routine.",
    city: "Houston",
    state: "Texas",
    country: "United States",
    hobbies: ["Running", "Music", "Content creation"],
    chart_prompts: ["A+ setups only"],
    off_chart_prompts: ["One pair done well"],
    trading: {
      markets: ["Forex"],
      sessions: ["New York", "London"],
      strategies: ["Price action", "Mixed"],
      trading_style: ["Day trader"],
      experience_level: "Building my edge",
      primary_goal: ["Get consistently profitable"],
      struggles: ["Discipline", "FOMO"],
      looking_for_gender: "Female",
      connection_types: ["1-on-1 Partner"],
      instruments: ["Majors", "Indices"],
      connection_reach: "Global",
    },
  },
  {
    email: "sofia.setups.demo+tradersworld@gmail.com",
    password: "DemoTrader123!",
    username: "SofiaSetups",
    full_name: "Sofia Reed",
    gender: "Female",
    bio: "Structured day trader working on funded-account consistency.",
    city: "Toronto",
    state: "Ontario",
    country: "Canada",
    hobbies: ["Yoga", "Travel", "Finance books"],
    chart_prompts: ["Execution beats prediction"],
    off_chart_prompts: ["Track the process"],
    trading: {
      markets: ["Forex"],
      sessions: ["London", "New York", "Multiple / flexible"],
      strategies: ["Smart money / ICT", "Mixed"],
      trading_style: ["Day trader", "Scalper"],
      experience_level: "Consistent & growing",
      primary_goal: ["Scale funded accounts", "Get consistently profitable"],
      struggles: ["Consistency", "Execution"],
      looking_for_gender: "Female",
      connection_types: ["1-on-1 Partner"],
      instruments: ["Majors", "Gold"],
      connection_reach: "Global",
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authHeader.replace("Bearer ", "").trim();
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = [];

  for (const demo of demoUsers) {
    let userId: string | null = null;

    const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === demo.email.toLowerCase());

    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(existing.id, {
        password: demo.password,
        email_confirm: true,
        user_metadata: {
          username: demo.username,
          full_name: demo.full_name,
        },
      });
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
        user_metadata: {
          username: demo.username,
          full_name: demo.full_name,
        },
      });

      if (createError || !created.user) {
        results.push({ email: demo.email, status: "failed", reason: createError?.message || "create failed" });
        continue;
      }

      userId = created.user.id;
    }

    await admin.from("profiles").upsert({
      id: userId,
      username: demo.username,
      full_name: demo.full_name,
      gender: demo.gender,
      onboarding_completed: true,
      bio: demo.bio,
      city: demo.city,
      state: demo.state,
      country: demo.country,
      hobbies: demo.hobbies,
      chart_prompts: demo.chart_prompts,
      off_chart_prompts: demo.off_chart_prompts,
      updated_at: new Date().toISOString(),
    });

    await admin.from("trading_profiles").upsert({
      user_id: userId,
      ...demo.trading,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    results.push({ email: demo.email, status: "ready", user_id: userId, username: demo.username });
  }

  return new Response(JSON.stringify({ seeded_by: user.email, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});