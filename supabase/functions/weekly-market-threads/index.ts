// Posts weekly market outlook threads from the system account every Monday.
// Triggered via pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_UID = "00000000-0000-0000-0000-000000000001";

function isoWeek(d = new Date()): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

const THREADS = [
  {
    forum: "Forex",
    title: (w: string) => `FX Majors — Week ${w} outlook`,
    content: () =>
      `📊 Weekly FX Majors thread.\n\nDrop your bias for the week on EURUSD, GBPUSD, USDJPY, AUDUSD, USDCHF, USDCAD, NZDUSD.\n\nThings to cover:\n• Higher-timeframe structure\n• Key levels you're watching\n• High-impact news on the calendar\n• Your A+ setup of the week\n\nReply below — keep it short, charts welcome.`,
  },
  {
    forum: "Futures",
    title: (w: string) => `ES & NQ — Week ${w} outlook`,
    content: () =>
      `📈 Weekly Index Futures thread.\n\nWhat's your read on /ES and /NQ this week?\n\nThings to cover:\n• HTF trend + key liquidity\n• Open range / overnight inventory plan\n• Catalysts (CPI, FOMC, earnings)\n• Your bias and invalidation\n\nDrop your levels.`,
  },
  {
    forum: "Options",
    title: (w: string) => `Options Flow — Week ${w} recap`,
    content: () =>
      `🎯 Weekly Options Flow thread.\n\nShare unusual activity, sweeps, and notable positioning from last week.\n\nThings to cover:\n• Tickers with the loudest flow\n• Bullish vs bearish skew\n• Vol setups you're stalking\n• 0DTE / weekly plays you're eyeing\n\nWhat's on your radar?`,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { year, week } = isoWeek();
    const tag = `${year}-W${String(week).padStart(2, "0")}`;
    const results: Array<{ forum: string; status: string; id?: string }> = [];

    for (const t of THREADS) {
      const title = t.title(tag);
      // Dedup: skip if a system thread with the same title already exists.
      const { data: existing } = await supabase
        .from("forum_posts")
        .select("id")
        .eq("user_id", SYSTEM_UID)
        .eq("title", title)
        .limit(1);
      if (existing && existing.length > 0) {
        results.push({ forum: t.forum, status: "skipped" });
        continue;
      }
      const { data, error } = await supabase
        .from("forum_posts")
        .insert({ user_id: SYSTEM_UID, forum: t.forum, title, content: t.content() })
        .select("id")
        .single();
      if (error) {
        results.push({ forum: t.forum, status: `error: ${error.message}` });
      } else {
        results.push({ forum: t.forum, status: "posted", id: data?.id });
      }
    }

    return new Response(JSON.stringify({ ok: true, week: tag, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});