import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body?.places) ? body.places : [];
    const places: string[] = [...new Set(
      raw.filter((p: unknown): p is string => typeof p === 'string')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 1 && p.length <= 160),
    )].slice(0, 60); // hard cap: bounded fan-out

    if (places.length === 0) {
      return new Response(JSON.stringify({ results: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Google Maps connector is not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Record<string, { lat: number; lng: number }> = {};

    // Small sequential batches keep gateway usage bounded.
    for (let i = 0; i < places.length; i += 5) {
      const chunk = places.slice(i, i + 5);
      await Promise.all(chunk.map(async (place) => {
        const res = await fetch(
          `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(place)}`,
          {
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
            },
          },
        );
        if (!res.ok) {
          const text = await res.text();
          console.error(`Geocode failed [${res.status}] for "${place}": ${text}`);
          return;
        }
        const json = await res.json();
        const loc = json?.results?.[0]?.geometry?.location;
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          results[place] = { lat: loc.lat, lng: loc.lng };
        }
      }));
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('geocode-cities error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
