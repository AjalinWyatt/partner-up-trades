import { supabase } from "@/integrations/supabase/client";

interface NotifyParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  relatedUserId?: string;
  entryId?: string;
}

/**
 * Insert a notification, skipping if a duplicate of the same type+user+related_user
 * exists within the last 24 hours.
 */
export async function sendNotification({
  userId,
  type,
  title,
  body,
  relatedUserId,
  entryId,
}: NotifyParams) {
  // De-duplicate: same type + same user + same related_user within 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", since);

  if (relatedUserId) {
    query = query.eq("actor_id", relatedUserId);
  }
  if (entryId) {
    query = query.eq("entry_id", entryId);
  }

  const { count } = await query;
  if (count && count > 0) return; // already notified within 24h

  await supabase.from("notifications").insert({
    user_id: userId,
    actor_id: relatedUserId || userId,
    type,
    title,
    body,
    entry_id: entryId || null,
  } as any);
}
