import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { key } = await req.json();
    if (typeof key !== "string" || key.length < 4 || key.length > 200) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const expected = Deno.env.get("BETA_ACCESS_KEY");

    // Primary: env-based check (instant, no DB seed needed)
    if (expected && key.trim() === expected.trim()) {
      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: DB-stored hashed keys
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.rpc("verify_beta_key", {
      submitted_key: key.trim(),
    });
    if (error) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: !!data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});