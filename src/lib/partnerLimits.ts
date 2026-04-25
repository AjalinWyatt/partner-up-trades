// Partner cap configuration and pro-membership helpers.
// Free tier = up to 3 accepted partners. Pro ($9.99/mo) = up to 12.
// Pro status is stored client-side as a flag for now (no payment provider wired yet).
// Swap `isProMember` to a server-side check once billing is enabled.

import { supabase } from "@/integrations/supabase/client";

export const FREE_PARTNER_LIMIT = 3;
export const PRO_PARTNER_LIMIT = 12;
export const PRO_PRICE_USD = 9.99;

const PRO_KEY = (uid: string) => `tw_pro_${uid}`;

export async function isProMember(userId: string): Promise<boolean> {
  try {
    return localStorage.getItem(PRO_KEY(userId)) === "1";
  } catch {
    return false;
  }
}

export function setProMember(userId: string, value: boolean) {
  try {
    if (value) localStorage.setItem(PRO_KEY(userId), "1");
    else localStorage.removeItem(PRO_KEY(userId));
  } catch {
    /* ignore */
  }
}

export async function getPartnerCap(userId: string): Promise<number> {
  return (await isProMember(userId)) ? PRO_PARTNER_LIMIT : FREE_PARTNER_LIMIT;
}

export async function getAcceptedPartnerCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("partner_connections")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq("status", "accepted");
  return count || 0;
}
