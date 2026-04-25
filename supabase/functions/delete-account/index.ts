import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Account deletion edge function.
 *
 * Authenticated user calls this to permanently delete their own account
 * and all associated data. We:
 *   1. Validate the JWT and resolve the user id
 *   2. Delete user-owned rows across all public tables (no DB FKs exist
 *      so we cannot rely on ON DELETE CASCADE)
 *   3. Delete the auth user via the admin API
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the caller
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Admin client for cleanup
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Tables where the user is the owner (single-user-id column tables)
    const ownedTables: { table: string; column: string }[] = [
      { table: "posts", column: "user_id" },
      { table: "post_likes", column: "user_id" },
      { table: "post_reposts", column: "user_id" },
      { table: "saved_posts", column: "user_id" },
      { table: "comments", column: "user_id" },
      { table: "feed_likes", column: "user_id" },
      { table: "feed_comments", column: "user_id" },
      { table: "stories", column: "user_id" },
      { table: "story_views", column: "viewer_id" },
      { table: "journal_entries", column: "user_id" },
      { table: "conversation_tags", column: "user_id" },
      { table: "conversation_tag_assignments", column: "user_id" },
      { table: "trading_profiles", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "passed_profiles", column: "passer_id" },
      { table: "blocked_users", column: "blocker_id" },
    ];

    for (const { table, column } of ownedTables) {
      const { error } = await admin.from(table).delete().eq(column, userId);
      if (error) console.error(`Cleanup ${table}:`, error.message);
    }

    // Tables with two-sided ownership
    await admin.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await admin.from("partner_connections").delete().or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
    await admin.from("saved_profiles").delete().or(`saver_id.eq.${userId},saved_id.eq.${userId}`);
    await admin.from("blocked_users").delete().eq("blocked_id", userId);
    await admin.from("notifications").delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`);

    // Profile last (other rows may reference it)
    await admin.from("profiles").delete().eq("id", userId);

    // Finally delete the auth user
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
