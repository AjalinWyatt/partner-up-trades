import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Loader2, RotateCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { getRecentLogs, onSupabaseLog, type SbLogEntry } from "@/lib/sbLogger";

type Status = "idle" | "running" | "pass" | "fail";

type Check = {
  id: string;
  label: string;
  description: string;
  /** Table whose RLS policies are most likely the culprit when this fails. */
  rlsTable?: string;
  run: (ctx: { userId: string }) => Promise<{ detail?: string }>;
};

type Result = { status: Status; detail?: string; error?: string; rlsTable?: string };

const POLICY_DOC = "https://supabase.com/dashboard/project/xkhleosrspxxdhtgwaqg/auth/policies";

const Diagnostics = () => {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<SbLogEntry[]>(getRecentLogs());

  useEffect(() => {
    // Hydrate + subscribe to live structured logs from the global fetch interceptor.
    setLogs(getRecentLogs());
    return onSupabaseLog(() => setLogs(getRecentLogs().slice().reverse()));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null);
      setAuthReady(true);
    });
  }, []);

  const checks: Check[] = useMemo(() => [
    {
      id: "connection",
      label: "Backend connection",
      description: "Confirms the Lovable Cloud REST endpoint is reachable.",
      run: async () => {
        const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
        if (error) throw error;
        return { detail: "Reachable" };
      },
    },
    {
      id: "auth_session",
      label: "Authenticated session",
      description: "Verifies the current user has a valid Supabase auth session.",
      run: async ({ userId }) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session");
        return { detail: `Signed in as ${userId.slice(0, 8)}…` };
      },
    },
    {
      id: "profiles_self",
      label: "Read own profile",
      description: "RLS: profiles SELECT must return your own row.",
      rlsTable: "profiles",
      run: async ({ userId }) => {
        const { data, error } = await supabase.from("profiles").select("id, username").eq("id", userId).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Own profile row missing");
        return { detail: `username: ${data.username ?? "—"}` };
      },
    },
    {
      id: "profiles_others",
      label: "Discover other profiles",
      description: "RLS: profiles SELECT must allow viewing other users (Discover feed).",
      rlsTable: "profiles",
      run: async ({ userId }) => {
        const { data, error } = await supabase.from("profiles").select("id").neq("id", userId).limit(5);
        if (error) throw error;
        return { detail: `${data?.length ?? 0} visible` };
      },
    },
    {
      id: "trading_profiles_read",
      label: "Read trading profiles",
      description: "RLS: trading_profiles SELECT must allow Discover/Match cards to render.",
      rlsTable: "trading_profiles",
      run: async () => {
        const { data, error } = await supabase.from("trading_profiles").select("user_id, markets").limit(5);
        if (error) throw error;
        return { detail: `${data?.length ?? 0} rows` };
      },
    },
    {
      id: "partner_requests",
      label: "Read partner requests",
      description: "RLS: partner_connections SELECT must return rows where you are requester or receiver.",
      rlsTable: "partner_connections",
      run: async ({ userId }) => {
        const { data, error } = await supabase
          .from("partner_connections")
          .select("id, status")
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
        if (error) throw error;
        const pending = data?.filter((c) => c.status === "pending").length ?? 0;
        return { detail: `${data?.length ?? 0} total · ${pending} pending` };
      },
    },
    {
      id: "connections_accepted",
      label: "Read accepted connections",
      description: "RLS: partner_connections must surface your accepted partnerships.",
      rlsTable: "partner_connections",
      run: async ({ userId }) => {
        const { data, error } = await supabase
          .from("partner_connections")
          .select("id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
        if (error) throw error;
        return { detail: `${data?.length ?? 0} accepted` };
      },
    },
    {
      id: "waitlist_insert",
      label: "Waitlist insert",
      description: "RLS: waitlist INSERT must accept anonymous and authenticated submissions.",
      rlsTable: "waitlist",
      run: async () => {
        const email = `diag_${Date.now()}@example.test`;
        const { error } = await supabase.from("waitlist").insert({
          email,
          market: "Forex",
          markets: ["Forex"],
          wants_beta: false,
        });
        if (error) throw error;
        return { detail: `inserted ${email}` };
      },
    },
    {
      id: "feed_read",
      label: "Read feed posts",
      description: "RLS: posts SELECT must return public feed entries.",
      rlsTable: "posts",
      run: async () => {
        const { data, error } = await supabase
          .from("posts")
          .select("id, created_at")
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) throw error;
        return { detail: `${data?.length ?? 0} posts` };
      },
    },
    {
      id: "messages_own",
      label: "Read own DMs",
      description: "RLS: messages SELECT must return rows where you are sender or receiver.",
      rlsTable: "messages",
      run: async ({ userId }) => {
        const { data, error } = await supabase
          .from("messages")
          .select("id")
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .limit(5);
        if (error) throw error;
        return { detail: `${data?.length ?? 0} accessible` };
      },
    },
    {
      id: "journals_own",
      label: "Read own journal entries",
      description: "RLS: journal_entries SELECT must be restricted to auth.uid().",
      rlsTable: "journal_entries",
      run: async ({ userId }) => {
        const { data, error } = await supabase.from("journal_entries").select("id").eq("user_id", userId).limit(5);
        if (error) throw error;
        return { detail: `${data?.length ?? 0} entries` };
      },
    },
  ], []);

  const runAll = async () => {
    if (!userId) return;
    setRunning(true);
    const next: Record<string, Result> = {};
    for (const c of checks) {
      next[c.id] = { status: "running", rlsTable: c.rlsTable };
      setResults({ ...next });
      try {
        const { detail } = await c.run({ userId });
        next[c.id] = { status: "pass", detail, rlsTable: c.rlsTable };
      } catch (e) {
        const err = e as { message?: string; code?: string };
        next[c.id] = { status: "fail", error: err.message ?? String(e), rlsTable: c.rlsTable };
      }
      setResults({ ...next });
    }
    setRunning(false);
  };

  useEffect(() => {
    if (authReady && isAdmin && userId && Object.keys(results).length === 0) runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, isAdmin, userId]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6">
        <p className="text-foreground">Sign in to run diagnostics.</p>
        <Button onClick={() => navigate("/sign-in")}>Sign in</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Diagnostics is admin-only</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Your account doesn't have the <code className="text-foreground">admin</code> role.
        </p>
        <Button variant="outline" onClick={() => navigate("/feed")}>Back to app</Button>
      </div>
    );
  }

  const total = checks.length;
  const passed = Object.values(results).filter((r) => r.status === "pass").length;
  const failed = Object.values(results).filter((r) => r.status === "fail").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <Button onClick={runAll} disabled={running} size="sm" className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            {running ? "Running…" : "Re-run all"}
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-1">Backend diagnostics</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Live checks against Lovable Cloud using your current session. Failed checks show the table whose RLS policy
          is most likely at fault.
        </p>

        <div className="flex items-center gap-3 mb-6 text-sm">
          <span className="px-2 py-1 rounded-md bg-muted">{passed}/{total} passing</span>
          {failed > 0 && (
            <span className="px-2 py-1 rounded-md bg-destructive/10 text-destructive">{failed} failing</span>
          )}
        </div>

        <div className="space-y-2">
          {checks.map((c) => {
            const r = results[c.id] ?? { status: "idle" as const };
            return (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {r.status === "pass" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {r.status === "fail" && <XCircle className="w-5 h-5 text-destructive" />}
                    {r.status === "running" && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                    {r.status === "idle" && <div className="w-5 h-5 rounded-full border border-border" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{c.label}</p>
                      {r.status === "pass" && r.detail && (
                        <span className="text-xs text-muted-foreground">{r.detail}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    {r.status === "fail" && (
                      <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                        <p className="text-destructive font-mono break-all">{r.error}</p>
                        {c.rlsTable && (
                          <p className="mt-2 text-muted-foreground">
                            Likely RLS policy on <code className="text-foreground">public.{c.rlsTable}</code>.{" "}
                            <a
                              href={POLICY_DOC}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline underline-offset-2"
                            >
                              Open policies for {c.rlsTable} →
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Need broader coverage? Re-run the <Link to="/feed" className="underline">smoke-test edge function</Link> for a
          full end-to-end suite (signup, onboarding, matches, DMs, journals, storage uploads).
        </p>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Supabase calls</h2>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(getRecentLogs(), null, 2))}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-3.5 h-3.5" /> Copy JSON
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Live tail of every auth/db/rpc/storage/realtime/edge-function request from this session. Errors are
            highlighted so you can see exactly which call broke after a schema change.
          </p>
          <div className="rounded-lg border border-border bg-card max-h-[420px] overflow-y-auto divide-y divide-border">
            {logs.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No calls captured yet — re-run the checks above or interact with the app.</p>
            ) : logs.map((l, i) => (
              <div key={i} className={`px-3 py-2 text-xs font-mono ${l.ok ? "" : "bg-destructive/5"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={l.ok ? "text-emerald-500" : "text-destructive"}>{l.ok ? "✓" : "✗"}</span>
                  <span className="text-muted-foreground">{new Date(l.ts).toLocaleTimeString()}</span>
                  <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80">{l.source}</span>
                  <span className="text-foreground">{l.op}</span>
                  {l.table && <span className="text-muted-foreground">· {l.table}</span>}
                  {l.bucket && <span className="text-muted-foreground">· bucket {l.bucket}</span>}
                  {l.function_name && <span className="text-muted-foreground">· fn {l.function_name}</span>}
                  {typeof l.status === "number" && <span className="text-muted-foreground">· {l.status}</span>}
                  {typeof l.duration_ms === "number" && <span className="text-muted-foreground">· {l.duration_ms}ms</span>}
                </div>
                {l.error && (
                  <p className="mt-1 text-destructive break-all">{l.error.code ? `[${l.error.code}] ` : ""}{l.error.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Diagnostics;