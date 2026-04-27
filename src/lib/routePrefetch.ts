import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Map route paths to their lazy-loaded module imports.
// Keep these as the SAME import expressions used in App.tsx so Vite dedupes
// the chunk and prefetch warms the exact module the router will use.
const routeImporters: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/discover": () => import("@/pages/Discover"),
  "/feed": () => import("@/pages/Feed"),
  "/messages": () => import("@/pages/Messages"),
  "/trading-log": () => import("@/pages/TradingLog"),
  "/partners": () => import("@/pages/Partners"),
  "/profile": () => import("@/pages/Profile"),
  "/settings": () => import("@/pages/Settings"),
  "/saved": () => import("@/pages/Saved"),
};

const prefetchedModules = new Set<string>();

/** Warm the JS bundle for a route — safe to call repeatedly. */
export function prefetchRoute(path: string) {
  if (prefetchedModules.has(path)) return;
  const importer = routeImporters[path];
  if (!importer) return;
  prefetchedModules.add(path);
  // Fire-and-forget; if it fails, allow a future retry.
  importer().catch(() => prefetchedModules.delete(path));
}

/**
 * Warm the data each route shows first. Uses React Query so the page mount
 * reads the cached value instantly instead of hitting the network.
 * Keep these queries cheap, scoped, and matched to the page's own keys.
 */
export async function prefetchRouteData(path: string, queryClient: QueryClient) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  switch (path) {
    case "/messages": {
      await queryClient.prefetchQuery({
        queryKey: ["messages", "conversations", userId],
        staleTime: 30_000,
        queryFn: async () => {
          const { data } = await supabase
            .from("messages")
            .select("id, sender_id, receiver_id, content, created_at, read, media_type")
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order("created_at", { ascending: false })
            .limit(50);
          return data ?? [];
        },
      });
      break;
    }
    case "/dashboard": {
      await queryClient.prefetchQuery({
        queryKey: ["notifications", "recent", userId],
        staleTime: 30_000,
        queryFn: async () => {
          const { data } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20);
          return data ?? [];
        },
      });
      break;
    }
    case "/feed": {
      await queryClient.prefetchQuery({
        queryKey: ["feed", "posts", "recent"],
        staleTime: 30_000,
        queryFn: async () => {
          const { data } = await supabase
            .from("posts")
            .select("id, user_id, content, caption, media_url, media_urls, media_type, created_at, likes_count")
            .order("created_at", { ascending: false })
            .limit(20);
          return data ?? [];
        },
      });
      break;
    }
    case "/partners": {
      await queryClient.prefetchQuery({
        queryKey: ["partners", "connections", userId],
        staleTime: 30_000,
        queryFn: async () => {
          const { data } = await supabase
            .from("partner_connections")
            .select("*")
            .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
            .eq("status", "accepted");
          return data ?? [];
        },
      });
      break;
    }
    case "/profile": {
      await queryClient.prefetchQuery({
        queryKey: ["profile", userId],
        staleTime: 60_000,
        queryFn: async () => {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          return data;
        },
      });
      break;
    }
    default:
      break;
  }
}

/** Convenient single-call helper for nav hover/touchstart handlers. */
export function warmRoute(path: string, queryClient: QueryClient) {
  prefetchRoute(path);
  // Run data prefetch microtask-deferred so it never blocks the hover handler.
  void Promise.resolve().then(() => prefetchRouteData(path, queryClient));
}