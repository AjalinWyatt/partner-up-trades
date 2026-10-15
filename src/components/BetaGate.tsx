import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Mail, User, Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Wordmark from "@/components/Wordmark";
import AuthGlobeBackground from "@/components/AuthGlobeBackground";
import { supabase } from "@/integrations/supabase/client";

/** Set to false when you're ready to reveal the real homepage to everyone. */
const WAITLIST_MODE = true;

const BETA_KEY = "MYOBxTWapp";
const MARKETS = ["Forex", "Futures", "Options"];

const BetaGate = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(() => {
    if (!WAITLIST_MODE) return true;
    // Never remember unlocks — everyone sees the waitlist unless the beta link is used.
    try { Object.keys(localStorage).filter((k) => k.startsWith("tw:beta-unlocked")).forEach((k) => localStorage.removeItem(k)); } catch {}
    return new URLSearchParams(window.location.search).get("beta") === BETA_KEY;
  });
  const [showKey, setShowKey] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === BETA_KEY) {
      setUnlocked(true);
    } else setError("That beta key isn't valid.");
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    const { error } = await supabase.from("waitlist" as any).insert({
      email: email.trim().toLowerCase(),
      name: name.trim() || null,
      phone: phone.trim() || null,
      markets,
      market: markets[0] ?? null,
    } as any);
    setSending(false);
    if (error && error.code !== "23505") return setError("Couldn't join right now. Please try again.");
    setJoined(true);
  };

  if (unlocked) return <>{children}</>;

  const toggle = (m: string) =>
    setMarkets((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  return (
    <div className="relative flex flex-col min-h-screen bg-background overflow-hidden">
      <AuthGlobeBackground height={340} />
      <div
        className="relative z-10 flex-1 flex flex-col px-7 pb-8 max-w-md mx-auto w-full"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 200px)" }}
      >
        <div className="flex justify-center"><Wordmark size="text-3xl" /></div>
        {joined ? (
          <div className="mt-10 flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center">
              <Check className="w-6 h-6 text-accent" />
            </div>
            <p className="text-[17px] text-foreground">You're on the list.</p>
            <p className="text-sm text-muted-foreground">We'll email you when TradersWorld opens.</p>
          </div>
        ) : showKey ? (
          <form onSubmit={handleKey} className="flex flex-col gap-6 mt-8">
            <div>
              <div className="flex items-center gap-3 pb-2">
                <KeyRound className="w-5 h-5 text-accent shrink-0" strokeWidth={1.8} />
                <input
                  placeholder="Beta Key"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError(""); }}
                  className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
                  required
                  autoFocus
                />
              </div>
              <div className="h-px bg-border" />
              {error && <p className="text-xs text-destructive mt-2">{error}</p>}
            </div>
            <Button type="submit" className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground text-[16px] font-bold rounded-2xl">
              Enter
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-5 mt-8">
            <div>
              <div className="flex items-center gap-3 pb-2">
                <User className="w-5 h-5 text-accent shrink-0" strokeWidth={1.8} />
                <input placeholder="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none" />
              </div>
              <div className="h-px bg-border" />
            </div>
            <div>
              <div className="flex items-center gap-3 pb-2">
                <Phone className="w-5 h-5 text-accent shrink-0" strokeWidth={1.8} />
                <input type="tel" placeholder="Phone number" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none" />
              </div>
              <div className="h-px bg-border" />
            </div>
            <div>
              <div className="flex items-center gap-3 pb-2">
                <Mail className="w-5 h-5 text-accent shrink-0" strokeWidth={1.8} />
                <input type="email" required placeholder="Email" value={email} maxLength={255}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none" />
              </div>
              <div className="h-px bg-border" />
            </div>
            <div className="flex gap-2 justify-center">
              {MARKETS.map((m) => (
                <button type="button" key={m} onClick={() => toggle(m)}
                  className={`px-4 h-9 rounded-full text-sm border transition-colors ${
                    markets.includes(m) ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted-foreground"
                  }`}>
                  {m}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <Button type="submit" disabled={sending} className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground text-[16px] font-bold rounded-2xl">
              {sending ? "Joining…" : "Join the waitlist"}
            </Button>
          </form>
        )}

      </div>
    </div>
  );
};

export default BetaGate;
