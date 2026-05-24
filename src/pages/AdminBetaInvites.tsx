import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Send, Eye, Users } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function AdminBetaInvites() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [checked, setChecked] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => setChecked(true), 800);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (checked && !isAdmin) navigate("/dashboard", { replace: true });
  }, [checked, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      // count opted-in
      const { data } = await supabase.functions.invoke("send-beta-invites", {
        body: { dryRun: true },
      });
      if (data?.count != null) setCount(data.count);
      // preview HTML
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/preview-transactional-email?template=beta-invite`,
        );
        if (res.ok) setPreviewHtml(await res.text());
      } catch {}
    })();
  }, [isAdmin]);

  const sendTest = async () => {
    if (!testEmail) return;
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("send-beta-invites", {
      body: { testEmail },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setResult(data);
    toast.success(`Sent test to ${testEmail}`);
  };

  const sendAll = async () => {
    if (!confirm(`Send beta invite to all ${count ?? "?"} opted-in waitlist users?`)) return;
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("send-beta-invites", { body: {} });
    setBusy(false);
    if (error) return toast.error(error.message);
    setResult(data);
    toast.success(`Sent ${data?.sent ?? 0} / ${data?.total ?? 0} invites`);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Beta Invites</h1>
        </header>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Waitlist members who opted in for beta:
            <span className="font-bold text-foreground">
              {count == null ? "…" : count}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Re-sends are deduped by email — safe to click again. Each recipient
            only gets one invite.
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Send className="h-4 w-4" /> Send a test first
          </h2>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button onClick={sendTest} disabled={busy || !testEmail}>
              Send Test
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Send to all opted-in beta users</h2>
          <Button
            onClick={sendAll}
            disabled={busy || !count}
            className="bg-primary"
          >
            {busy ? "Sending…" : `Send to ${count ?? 0} traders`}
          </Button>
          {result && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="font-semibold">Preview</span>
          </div>
          {previewHtml ? (
            <iframe
              title="email preview"
              srcDoc={previewHtml}
              className="w-full h-[800px] bg-white"
            />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading preview…
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}