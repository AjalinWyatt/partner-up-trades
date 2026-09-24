import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";

type Report = {
  id: string; reporter_id: string; reported_id: string; context: string; reason: string;
  details: string | null; status: string; admin_note: string | null; created_at: string;
};
type Mini = { id: string; username: string | null; avatar_url: string | null };
const TABS = ["open", "actioned", "dismissed"] as const;

export default function AdminReports() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>("open");
  const [reports, setReports] = useState<Report[]>([]);
  const [people, setPeople] = useState<Record<string, Mini>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("user_reports").select("*").eq("status", tab).order("created_at", { ascending: false }).limit(200);
    const rows = (data || []) as Report[];
    setReports(rows);
    const ids = [...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
      setPeople(Object.fromEntries((profs || []).map((p) => [p.id, p])));
      const { data: all } = await supabase.from("user_reports").select("reported_id").in("reported_id", rows.map((r) => r.reported_id));
      const c: Record<string, number> = {};
      (all || []).forEach((r) => { c[r.reported_id] = (c[r.reported_id] || 0) + 1; });
      setCounts(c);
    }
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, tab]);

  const resolve = async (r: Report, status: "actioned" | "dismissed" | "open") => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("user_reports").update({
      status, admin_note: notes[r.id]?.trim() || r.admin_note, reviewed_by: status === "open" ? null : session?.user.id, reviewed_at: status === "open" ? null : new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error("Update failed");
    toast.success(status === "open" ? "Reopened" : status === "actioned" ? "Marked actioned" : "Dismissed");
    setReports((rs) => rs.filter((x) => x.id !== r.id));
  };

  const who = (id: string) => people[id]?.username ? `@${people[id].username}` : id.slice(0, 8);

  if (!isAdmin) return <AppLayout><div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Admins only.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold"><Flag className="h-5 w-5" />Reports</h1>
        <p className="mb-4 text-sm text-muted-foreground">Review reports from profiles and chats.</p>
        <div className="mb-4 flex gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded-full px-3 py-1 text-xs capitalize", tab === t ? "bg-secondary text-foreground" : "text-muted-foreground")}>{t}</button>
          ))}
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : reports.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No {tab} reports.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button className="text-sm font-semibold hover:underline" onClick={() => navigate(`/profile/${r.reported_id}`)}>{who(r.reported_id)}</button>
                    <span className="ml-2 text-xs text-muted-foreground">{counts[r.reported_id] || 1} report{(counts[r.reported_id] || 1) > 1 ? "s" : ""} total</span>
                    <p className="text-xs text-muted-foreground">Reported by {who(r.reporter_id)} · from {r.context} · {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <span className="shrink-0 rounded bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">{r.reason}</span>
                </div>
                {r.details && <p className="mt-2 whitespace-pre-wrap text-sm">{r.details}</p>}
                {r.admin_note && tab !== "open" && <p className="mt-2 text-xs text-muted-foreground">Note: {r.admin_note}</p>}
                {tab === "open" ? (
                  <>
                    <Textarea value={notes[r.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="Admin note (optional)" className="mt-2 min-h-[50px] text-sm" />
                    <div className="mt-2 flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => resolve(r, "dismissed")}>Dismiss</Button>
                      <Button size="sm" onClick={() => resolve(r, "actioned")}>Mark actioned</Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 flex justify-end"><Button size="sm" variant="ghost" onClick={() => resolve(r, "open")}>Reopen</Button></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
