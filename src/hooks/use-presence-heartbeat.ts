import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pings the backend every minute (and on tab focus) to mark the current user
 * as online. Powers "online traders" counts via profiles.last_seen_at.
 */
export function usePresenceHeartbeat() {
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    let pinging = false;
    const ping = async () => {
      if (pinging || !active) return;
      pinging = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !active) return;
        await supabase.rpc("touch_presence" as any);
      } catch (error) {
        console.warn("Presence update skipped", error);
      } finally {
        pinging = false;
      }
    };

    ping();
    timer = setInterval(ping, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}