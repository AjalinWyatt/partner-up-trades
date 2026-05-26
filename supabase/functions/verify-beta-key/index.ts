const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Soft beta gate: during launch we accept any non-empty key so no one gets
  // locked out. The gate stays in the UI so the app still feels "invite only".
  try {
    const { key } = await req.json().catch(() => ({ key: "" }));
    const ok = typeof key === "string" && key.trim().length >= 4;
    return new Response(JSON.stringify({ valid: ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});