import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "valid" | "used" | "invalid" | "done" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return setState("invalid");
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: ANON } },
        );
        const data = await res.json().catch(() => ({}));
        if (data?.used) setState("used");
        else if (data?.valid) {
          setEmail(data.email ?? null);
          setState("valid");
        } else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    if (error) setState("error");
    else setState("done");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="flex justify-center">
          {state === "done" || state === "used" ? (
            <CheckCircle2 className="h-12 w-12 text-primary" />
          ) : state === "invalid" || state === "error" ? (
            <XCircle className="h-12 w-12 text-destructive" />
          ) : (
            <Mail className="h-12 w-12 text-primary" />
          )}
        </div>
        {state === "loading" && <p>Checking your link…</p>}
        {state === "valid" && (
          <>
            <h1 className="text-xl font-bold">Unsubscribe from emails?</h1>
            <p className="text-sm text-muted-foreground">
              {email ? <>You're about to unsubscribe <strong>{email}</strong> from Traders World emails.</> : "Confirm to stop receiving emails from Traders World."}
            </p>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? "Unsubscribing…" : "Confirm Unsubscribe"}
            </Button>
          </>
        )}
        {state === "done" && (
          <>
            <h1 className="text-xl font-bold">You're unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You won't receive any more emails from us.</p>
          </>
        )}
        {state === "used" && (
          <>
            <h1 className="text-xl font-bold">Already unsubscribed</h1>
            <p className="text-sm text-muted-foreground">This email is already opted out.</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <h1 className="text-xl font-bold">Invalid link</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">Please try again in a moment.</p>
          </>
        )}
      </Card>
    </div>
  );
}