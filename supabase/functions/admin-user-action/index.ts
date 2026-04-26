import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Admin-only: perform moderation actions on a target user.
 * Body: { target_user_id: string, action: "delete" | "ban" | "unban" | "timeout", duration_hours?: number }
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
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .limit(1);
    if (roleErr || !roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const targetId = body?.target_user_id as string | undefined;
    const action = body?.action as string | undefined;
    const durationHours = Number(body?.duration_hours) || 0;

    if (!targetId || !action) {
      return new Response(JSON.stringify({ error: "Missing target_user_id or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (targetId === callerId && action !== "unban") {
      return new Response(JSON.stringify({ error: "Cannot perform this action on yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban") {
      // ~100 years
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: "876000h",
      } as any);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unban") {
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: "none",
      } as any);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "timeout") {
      const hours = durationHours > 0 ? durationHours : 24;
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: `${hours}h`,
      } as any);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, hours }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      // Cascade cleanup mirroring delete-account
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
        { table: "forum_posts", column: "user_id" },
        { table: "forum_replies", column: "user_id" },
        { table: "forum_post_likes", column: "user_id" },
      ];
      for (const { table, column } of ownedTables) {
        const { error } = await admin.from(table).delete().eq(column, targetId);
        if (error) console.error(`Cleanup ${table}:`, error.message);
      }
      await admin.from("messages").delete().or(`sender_id.eq.${targetId},receiver_id.eq.${targetId}`);
      await admin.from("partner_connections").delete().or(`requester_id.eq.${targetId},receiver_id.eq.${targetId}`);
      await admin.from("saved_profiles").delete().or(`saver_id.eq.${targetId},saved_id.eq.${targetId}`);
      await admin.from("blocked_users").delete().eq("blocked_id", targetId);
      await admin.from("notifications").delete().or(`user_id.eq.${targetId},actor_id.eq.${targetId}`);
      await admin.from("profiles").delete().eq("id", targetId);

      const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
      if (delErr) throw delErr;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-user-action error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});