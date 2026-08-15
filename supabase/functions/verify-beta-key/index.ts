const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Single valid beta key.
  const VALID_KEY = "WorldTradersxxKey";
  try {
    const { key } = await req.json().catch(() => ({ key: "" }));
    const ok = typeof key === "string" && key.trim() === VALID_KEY;
    return new Response(JSON.stringify({ valid: ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ valid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});