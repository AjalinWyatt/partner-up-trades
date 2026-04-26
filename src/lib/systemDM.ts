import { supabase } from "@/integrations/supabase/client";

export const TRADERSWORLD_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Asks the server to send a one-time DM from the official TradersWorld system
 * account to the currently authenticated user. The actual insert happens in
 * the `send-system-dm` edge function with the service role, because direct
 * client inserts as the system account are blocked by RLS + a DB trigger.
 * Idempotent: each `dmKey` is delivered at most once per user.
 */
export async function sendSystemDMOnce(params: {
  userId?: string; // accepted for back-compat, not used (server reads JWT)
  dmKey: string;
  body?: string;   // accepted for back-compat; the server owns the template
}) {
  const { dmKey } = params;
  const { data, error } = await supabase.functions.invoke("send-system-dm", {
    body: { dmKey },
  });
  if (error) {
    console.error("system DM invoke failed", error);
    return false;
  }
  return !!data?.sent;
}

export const WELCOME_SHARE_DM = `Welcome to TradersWorld 👋🏽

We're actively growing the network, so matches may take a little time. Want to help speed it up?

Share TradersWorld on your socials and help bring more traders into the community. More traders = better matches for everyone.

Appreciate you being early 🙏🏾`;