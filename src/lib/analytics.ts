import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight in-app event tracker.
 *
 * Writes to the public.analytics_events table. Fire-and-forget - errors
 * are swallowed so analytics never breaks user flows. Admins can read the
 * table to build funnel reports.
 *
 * Usage:
 *   trackEvent("signup_completed", { method: "email" })
 *   trackEvent("onboarding_step_completed", { step: 3 })
 *   trackEvent("pulse_request_sent", { context: ["Bad Loss"] })
 */
export async function trackEvent(
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event,
      user_id: user?.id ?? null,
      properties: properties as never,
    } as never);
  } catch {
    // Silently ignore - analytics must never break the app.
  }
}
