import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_journal_entry",
  title: "Add journal entry",
  description: "Log a new trade in the signed-in trader's trading log.",
  inputSchema: {
    market_pair: z.string().trim().min(1).describe("Instrument, e.g. EURUSD or ES."),
    result: z.enum(["win", "loss", "breakeven"]).optional().describe("Trade outcome."),
    pnl_pips: z.number().optional().describe("Profit/loss amount."),
    notes: z.string().max(5000).optional().describe("Trade notes."),
    tags: z.array(z.string()).optional().describe("Performance tags."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("journal_entries")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select("id, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Logged trade ${data.id}` }] };
  },
});
