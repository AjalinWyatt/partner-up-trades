import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDiscoverMatches } from "@/lib/discoverMatches";

/**
 * Tracks unread/new counts for the three nav slots that show a blue dot:
 * - Home (unread notifications)
 * - Messages (unread DMs received)
 * - Discover (pending incoming partner requests = "new matches")
 *
 * Counts auto-clear when the user visits the corresponding page (we treat the
 * visit as "seen" for the dot — actual read-state in DB is handled elsewhere).
 */
export function useNavBadges() {
  const location = useLocation();
  const [home, setHome] = useState(0);
  const [messages, setMessages] = useState(0);
  const [discover, setDiscover] = useState(0);
  const [partners, setPartners] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const [notifs, msgs, reqs, matches] = await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("read", false),
        supabase
          .from("partner_connections")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("status", "pending"),
        getDiscoverMatches(user.id).catch(() => ({ matches: [] as Array<{ matchPct: number }> })),
      ]);
      if (cancelled) return;
      setHome(notifs.count ?? 0);
      setMessages(msgs.count ?? 0);
      setPartners(reqs.count ?? 0);
      const strongMatches = (matches?.matches || []).filter((m) => (m.matchPct ?? 0) >= 65).length;
      setDiscover(strongMatches);
    };

    load();
    return () => { cancelled = true; };
  }, [location.pathname]);

  // Visiting the page hides its dot immediately (optimistic clear).
  // The next pathname change will re-query and reflect server truth.
  const path = location.pathname;
  const homeDot = home > 0 && path !== "/dashboard";
  const messagesDot = messages > 0 && path !== "/messages";
  const discoverDot = discover > 0 && path !== "/discover";
  const partnersDot = partners > 0 && path !== "/partners";

  return { homeDot, messagesDot, discoverDot, partnersDot };
}