import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_journal_entries",
  title: "List journal entries",
  description: "List the signed-in trader's most recent trading log entries.",
  inputSchema: { limit: z.number().int().min(1).max(100).default(20).describe("Max entries to return.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("journal_entries")
      .select("id, created_at, market_pair, result, pnl_pips, pnl_unit, session, mood, notes, tags")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
  },
});
