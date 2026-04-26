import { supabase } from "@/integrations/supabase/client";

export const TRADERSWORLD_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Sends a one-time DM from the official TradersWorld system account to the
 * given user. Uses `system_dm_log` to make sure each `dmKey` is delivered at
 * most once per user.
 */
export async function sendSystemDMOnce(params: {
  userId: string;
  dmKey: string;
  body: string;
}) {
  const { userId, dmKey, body } = params;

  // Already sent? bail.
  const { data: existing } = await supabase
    .from("system_dm_log")
    .select("id")
    .eq("user_id", userId)
    .eq("dm_key", dmKey)
    .maybeSingle();
  if (existing) return false;

  // Insert the message (RLS allows this only when sender = TradersWorld
  // system account AND receiver = current user).
  const { error: msgErr } = await supabase.from("messages").insert({
    sender_id: TRADERSWORLD_SYSTEM_USER_ID,
    receiver_id: userId,
    content: body,
  } as any);
  if (msgErr) {
    console.error("system DM insert failed", msgErr);
    return false;
  }

  // Record that we sent it (best-effort; unique constraint prevents dupes).
  await supabase.from("system_dm_log").insert({
    user_id: userId,
    dm_key: dmKey,
  } as any);

  return true;
}

export const WELCOME_NO_PARTNERS_DM = `Welcome to TradersWorld! 👋

We're a brand new community working to bring traders together to find their accountability partners. Looks like you don't have any partners yet — would you mind sharing TradersWorld on your socials? It helps both you (more traders = better matches for you) and everyone else find their people here.

Even one post or story makes a real difference. Thank you for being an early member 🙏

— The TradersWorld team`;