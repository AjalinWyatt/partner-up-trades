import { useEffect, useRef, useState } from "react";
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
 *
 * Performance:
 * - Route-change refreshes are debounced (150ms) and coalesced — rapid
 *   navigation only fires one batched query at the end.
 * - In-flight refreshes are cancelled when a newer one starts (via a
 *   monotonically-increasing request id), so stale results never overwrite
 *   fresh ones.
 * - The discover query (the heaviest) is additionally throttled by a
 *   minimum interval, so realtime bursts can't spam it.
 */
const ROUTE_DEBOUNCE_MS = 150;
const DISCOVER_MIN_INTERVAL_MS = 1500;

export function useNavBadges() {
  const location = useLocation();
  const [home, setHome] = useState(0);
  const [messages, setMessages] = useState(0);
  const [discover, setDiscover] = useState(0);
  const [partners, setPartners] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  // Debounce timers / cancellation tokens.
  const routeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0); // monotonic id; stale responses are dropped
  const lastDiscoverAtRef = useRef(0); // throttle floor for discover
  const cachedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Coalesce rapid route changes into a single batched query.
    if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);

    const myReqId = ++reqIdRef.current;

    routeDebounceRef.current = setTimeout(async () => {
      // Resolve user id once, then cache it for subsequent route changes.
      let uid = cachedUserIdRef.current;
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id ?? null;
        if (!uid) return;
        cachedUserIdRef.current = uid;
        if (myReqId === reqIdRef.current) setUserId(uid);
      }

      // Skip discover if we ran it very recently (covers tab-spam scenarios).
      const now = Date.now();
      const skipDiscover = now - lastDiscoverAtRef.current < DISCOVER_MIN_INTERVAL_MS;
      if (!skipDiscover) lastDiscoverAtRef.current = now;

      const [notifs, msgs, reqs, matches] = await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("read", false),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", uid)
          .eq("read", false),
        supabase
          .from("partner_connections")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", uid)
          .eq("status", "pending"),
        skipDiscover
          ? Promise.resolve(null)
          : getDiscoverMatches(uid).catch(() => ({ matches: [] as Array<{ matchPct: number }> })),
      ]);

      // Drop stale responses if a newer route change has already kicked off.
      if (myReqId !== reqIdRef.current) return;

      setHome(notifs.count ?? 0);
      setMessages(msgs.count ?? 0);
      setPartners(reqs.count ?? 0);
      if (matches) {
        const strong = (matches.matches || []).filter((m) => (m.matchPct ?? 0) >= 65).length;
        setDiscover(strong);
      }
    }, ROUTE_DEBOUNCE_MS);

    return () => {
      if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    };
  }, [location.pathname]);

  // Realtime listeners: bump counts the moment new rows arrive on the server,
  // so the blue dot appears without needing a route change.
  useEffect(() => {
    if (!userId) return;

    const refreshDiscover = () => {
      if (discoverDebounceRef.current) clearTimeout(discoverDebounceRef.current);
      discoverDebounceRef.current = setTimeout(async () => {
        // Throttle: respect the minimum interval so realtime bursts don't spam.
        const now = Date.now();
        const wait = Math.max(0, DISCOVER_MIN_INTERVAL_MS - (now - lastDiscoverAtRef.current));
        if (wait > 0) {
          discoverDebounceRef.current = setTimeout(refreshDiscover, wait);
          return;
        }
        lastDiscoverAtRef.current = Date.now();
        const myReqId = ++reqIdRef.current;
        try {
          const { matches } = await getDiscoverMatches(userId);
          if (myReqId !== reqIdRef.current) return;
          const strong = (matches || []).filter((m) => (m.matchPct ?? 0) >= 65).length;
          setDiscover(strong);
        } catch {/* ignore */}
      }, 400);
    };

    const channel = supabase
      .channel(`nav-badges-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setHome((n) => n + 1),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        () => setMessages((n) => n + 1),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "partner_connections", filter: `receiver_id=eq.${userId}` },
        (payload) => {
          const status = (payload.new as { status?: string } | null)?.status;
          if (status === "pending") setPartners((n) => n + 1);
          // A new connection (pending or accepted) changes the discover candidate pool.
          refreshDiscover();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "partner_connections", filter: `receiver_id=eq.${userId}` },
        () => refreshDiscover(),
      )
      // Also listen as the requester so accepting/declining elsewhere refreshes discover.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "partner_connections", filter: `requester_id=eq.${userId}` },
        () => refreshDiscover(),
      )
      .subscribe();

    return () => {
      if (discoverDebounceRef.current) clearTimeout(discoverDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Visiting the page hides its dot immediately (optimistic clear).
  // The next pathname change will re-query and reflect server truth.
  const path = location.pathname;
  const homeDot = home > 0 && path !== "/dashboard";
  const messagesDot = messages > 0 && path !== "/messages";
  const discoverDot = discover > 0 && path !== "/discover";
  const partnersDot = partners > 0 && path !== "/partners";

  return { homeDot, messagesDot, discoverDot, partnersDot };
}