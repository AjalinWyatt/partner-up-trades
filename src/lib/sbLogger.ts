/**
 * Structured Supabase logger.
 *
 * Two layers:
 * 1. `installSupabaseLogger()` - patches the global `fetch` once and emits a
 *    structured log line for EVERY Supabase REST / Auth / Storage / Realtime
 *    request. Zero changes required at call sites.
 * 2. `track(flow, op, fn)` - opt-in wrapper for individual call sites that
 *    want a richer flow/op label (e.g. "onboarding/save_profile") on top of
 *    the auto-captured network log.
 *
 * All logs share one shape so you can filter in DevTools or pipe to
 * `analytics_events` without reformatting.
 */
import { supabase } from "@/integrations/supabase/client";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type SbLogEntry = {
  ts: string;                 // ISO timestamp
  level: LogLevel;
  source: "auth" | "db" | "storage" | "realtime" | "functions" | "rpc" | "unknown";
  op: string;                 // e.g. GET, POST, signInWithPassword, channel.subscribe
  table?: string;             // resolved REST table when applicable
  bucket?: string;            // resolved storage bucket when applicable
  function_name?: string;     // edge function slug when applicable
  flow?: string;              // optional caller-supplied flow name (e.g. onboarding)
  duration_ms?: number;
  status?: number;            // HTTP status when applicable
  ok: boolean;
  error?: { code?: string; message: string };
  user_id?: string;
  request_id?: string;        // sb-request-id when present
  meta?: Record<string, unknown>;
};

type Listener = (e: SbLogEntry) => void;
const listeners = new Set<Listener>();

/** Subscribe to every structured log line. Returns an unsubscribe fn. */
export function onSupabaseLog(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** In-memory ring buffer the Diagnostics page can render. */
const ring: SbLogEntry[] = [];
const RING_MAX = 200;
export function getRecentLogs(): SbLogEntry[] {
  return ring.slice();
}

function emit(entry: SbLogEntry) {
  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();

  // Console output uses appropriate level so filtering in DevTools just works.
  const tag = `[sb:${entry.source}] ${entry.op}`;
  const fields: Record<string, unknown> = {
    flow: entry.flow,
    table: entry.table,
    bucket: entry.bucket,
    function: entry.function_name,
    duration_ms: entry.duration_ms,
    status: entry.status,
    request_id: entry.request_id,
    user_id: entry.user_id,
    ...(entry.meta ?? {}),
  };
  // Drop undefined values for clean console rendering
  for (const k of Object.keys(fields)) if (fields[k] === undefined) delete fields[k];

  if (entry.ok) {
    if (entry.level === "warn") console.warn(tag, fields);
    else console.info(tag, fields);
  } else {
    console.error(tag, { ...fields, error: entry.error });
  }

  for (const l of listeners) {
    try { l(entry); } catch { /* listener errors must never break logging */ }
  }
}

let installed = false;
let cachedUserId: string | undefined;

/** Classify a Supabase URL into source + table/bucket/function. */
function classify(urlStr: string, method: string): {
  source: SbLogEntry["source"];
  table?: string;
  bucket?: string;
  function_name?: string;
  op: string;
} {
  let url: URL;
  try { url = new URL(urlStr); } catch { return { source: "unknown", op: method }; }
  const path = url.pathname;
  if (path.startsWith("/auth/v1/")) {
    const op = path.replace("/auth/v1/", "") || method;
    return { source: "auth", op: `${method} ${op}` };
  }
  if (path.startsWith("/rest/v1/rpc/")) {
    const fn = path.replace("/rest/v1/rpc/", "");
    return { source: "rpc", op: `${method} ${fn}`, function_name: fn };
  }
  if (path.startsWith("/rest/v1/")) {
    const table = path.replace("/rest/v1/", "").split("?")[0].split("/")[0];
    return { source: "db", op: method, table };
  }
  if (path.startsWith("/storage/v1/object/")) {
    const rest = path.replace("/storage/v1/object/", "");
    // Possible prefixes: public/<bucket>/..., authenticated/<bucket>/..., <bucket>/...
    const parts = rest.split("/").filter(Boolean);
    const bucket = parts[0] === "public" || parts[0] === "authenticated" ? parts[1] : parts[0];
    return { source: "storage", op: method, bucket };
  }
  if (path.startsWith("/functions/v1/")) {
    const fn = path.replace("/functions/v1/", "").split("/")[0];
    return { source: "functions", op: `${method} ${fn}`, function_name: fn };
  }
  if (path.startsWith("/realtime/")) return { source: "realtime", op: `${method} ${path}` };
  return { source: "unknown", op: `${method} ${path}` };
}

/**
 * Patch global `fetch` to emit a structured log for every Supabase request.
 * Safe to call multiple times - it installs at most once.
 */
export function installSupabaseLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Cache the current user_id so logs carry it without a round trip per call.
  void supabase.auth.getSession().then(({ data }) => { cachedUserId = data.session?.user.id; });
  supabase.auth.onAuthStateChange((_event, session) => { cachedUserId = session?.user.id; });

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
  if (!supabaseUrl) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input
                  : input instanceof URL ? input.toString()
                  : input.url;
    // Only log requests aimed at this project's Supabase host.
    if (!urlStr.startsWith(supabaseUrl)) return originalFetch(input, init);

    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const started = performance.now();
    const meta = classify(urlStr, method);

    try {
      const res = await originalFetch(input, init);
      const duration_ms = Math.round(performance.now() - started);
      const ok = res.ok;
      const entry: SbLogEntry = {
        ts: new Date().toISOString(),
        level: ok ? "info" : "error",
        source: meta.source,
        op: meta.op,
        table: meta.table,
        bucket: meta.bucket,
        function_name: meta.function_name,
        duration_ms,
        status: res.status,
        ok,
        user_id: cachedUserId,
        request_id: res.headers.get("sb-request-id") ?? res.headers.get("x-request-id") ?? undefined,
      };
      if (!ok) {
        // Try to surface the API error body without breaking response consumption.
        try {
          const cloned = res.clone();
          const txt = await cloned.text();
          let parsed: unknown = txt;
          try { parsed = JSON.parse(txt); } catch { /* keep text */ }
          const p = parsed as { code?: string; message?: string; error?: string };
          entry.error = { code: p?.code, message: p?.message ?? p?.error ?? txt.slice(0, 240) };
        } catch { /* ignore */ }
      }
      emit(entry);
      return res;
    } catch (e) {
      const duration_ms = Math.round(performance.now() - started);
      const message = e instanceof Error ? e.message : String(e);
      emit({
        ts: new Date().toISOString(),
        level: "error",
        source: meta.source,
        op: meta.op,
        table: meta.table,
        bucket: meta.bucket,
        function_name: meta.function_name,
        duration_ms,
        ok: false,
        user_id: cachedUserId,
        error: { message },
      });
      throw e;
    }
  };
}

/**
 * Opt-in wrapper for richer flow context. Use when you want a single log line
 * that ties multiple low-level calls back to a named flow/op.
 *
 * Example:
 *   await track("onboarding", "save_trading_profile", () =>
 *     supabase.from("trading_profiles").update(payload).eq("user_id", uid)
 *   );
 */
export async function track<T>(
  flow: string,
  op: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  const started = performance.now();
  try {
    const result = await fn();
    // Detect Supabase-style { error } responses and downgrade to error log.
    const maybe = result as unknown as { error?: { message?: string; code?: string } };
    const sbError = maybe && typeof maybe === "object" && "error" in maybe ? maybe.error ?? null : null;
    emit({
      ts: new Date().toISOString(),
      level: sbError ? "error" : "info",
      source: "unknown",
      op,
      flow,
      duration_ms: Math.round(performance.now() - started),
      ok: !sbError,
      user_id: cachedUserId,
      error: sbError ? { code: sbError.code, message: sbError.message ?? "unknown" } : undefined,
      meta,
    });
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    emit({
      ts: new Date().toISOString(),
      level: "error",
      source: "unknown",
      op,
      flow,
      duration_ms: Math.round(performance.now() - started),
      ok: false,
      user_id: cachedUserId,
      error: { message },
      meta,
    });
    throw e;
  }
}