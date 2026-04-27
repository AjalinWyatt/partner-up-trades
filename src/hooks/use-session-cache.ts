import { useEffect, useRef, useState } from "react";

/**
 * Persists React state in sessionStorage so revisiting a page paints
 * the last-known value INSTANTLY on mount, while a fresh fetch runs
 * in the background. This is the trick Instagram/Twitter use to make
 * navigation feel zero-latency even when the network is slow.
 *
 * Usage:
 *   const [posts, setPosts] = useSessionCache<Post[]>("feed:posts", []);
 *   useEffect(() => { fetchPosts().then(setPosts); }, []);
 *
 * - Reads synchronously on first render (no flicker, no spinner).
 * - Writes are debounced via a microtask to avoid blocking renders.
 * - Falls back gracefully if sessionStorage is unavailable (private mode).
 */
export function useSessionCache<T>(key: string, initial: T) {
  const storageKey = `tw:cache:${key}`;

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  // Track whether we've hydrated so the parent can skip its loading
  // spinner when cached data is already on screen.
  const hadCacheRef = useRef<boolean>(false);
  if (!hadCacheRef.current) {
    try {
      hadCacheRef.current =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem(storageKey) != null;
    } catch {
      hadCacheRef.current = false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // Quota exceeded or private mode — silently ignore.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, value]);

  return [value, setValue, hadCacheRef.current] as const;
}

/**
 * Drop one or more cached page entries. Call this right after a mutation
 * that would make the cached snapshot stale (e.g. creating a post invalidates
 * the feed cache so the next visit refetches instead of showing the old list).
 *
 * Pass plain keys without the "tw:cache:" prefix:
 *   invalidateSessionCache("feed:posts", "dashboard:updates")
 */
export function invalidateSessionCache(...keys: string[]) {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    try {
      window.sessionStorage.removeItem(`tw:cache:${key}`);
    } catch {
      // ignore
    }
  }
}