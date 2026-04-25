import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, KeyRound, Sparkles, Zap, Users, MessageSquare,
  TrendingUp, Bell, Heart, Shield, Activity, Mic, BookOpen,
  Globe as GlobeIcon, Instagram, Youtube, CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Wordmark from "@/components/Wordmark";
import authGlobe from "@/assets/auth-globe.png";

const MARKETS = ["Forex", "Futures", "Options", "Stocks", "Crypto", "Indices", "Commodities"];

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

/* ───────────────── Beta key modal ───────────────── */
const BetaKeyModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!open) setKey(""); }, [open]);

  const submit = async () => {
    if (!key.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-beta-key", { body: { key: key.trim() } });
      if (error) throw error;
      if (data?.valid) {
        sessionStorage.setItem("beta_unlocked", "1");
        toast.success("Beta access unlocked");
        onClose();
        navigate("/sign-up");
      } else {
        toast.error("Invalid beta key");
      }
    } catch {
      toast.error("Could not verify key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm">
        <DialogTitle className="sr-only">Enter beta access key</DialogTitle>
        <div className="py-2">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5 text-accent" />
          </div>
          <p className="text-lg font-bold mb-1 text-foreground">Enter your beta key</p>
          <p className="text-sm text-muted-foreground mb-5">
            Beta testers were sent a private access key. Paste it below to unlock sign-up.
          </p>
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="xxxx-xxxx-xxxx"
            autoFocus
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent mb-3 font-mono tracking-wider"
          />
          <button
            onClick={submit}
            disabled={loading || !key.trim()}
            className="w-full py-3 rounded-full bg-accent text-accent-foreground font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? "Verifying…" : "Unlock sign-up"}
          </button>
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            No key? Join the waitlist below to get notified at launch.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ───────────────── Waitlist form ───────────────── */
const WaitlistForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [wantsBeta, setWantsBeta] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleMarket = (m: string) =>
    setMarkets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email"); return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid phone number"); return;
    }
    if (markets.length === 0) {
      toast.error("Pick at least one market"); return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist" as any).insert({
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      markets,
      market: markets[0],
      wants_beta: wantsBeta,
    } as any);
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Something went wrong. Try again.");
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-3xl p-6 sm:p-7 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email *</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com" required
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Phone *</label>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+1 555 000 0000" required
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Markets you trade *</label>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map(m => {
            const active = markets.includes(m);
            return (
              <button
                type="button" key={m} onClick={() => toggleMarket(m)}
                className={`px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                  active
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-secondary text-muted-foreground border-border hover:border-accent/50 hover:text-foreground"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-border bg-secondary hover:border-accent/40 px-4 py-3 transition-colors">
        <input
          type="checkbox" checked={wantsBeta} onChange={e => setWantsBeta(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-[hsl(var(--accent))]"
        />
        <span className="flex-1">
          <span className="block text-[13px] font-bold text-foreground">I want to be a beta tester</span>
          <span className="block text-[11px] text-muted-foreground mt-0.5">Get early access before public launch + help shape the platform.</span>
        </span>
        <Sparkles className="w-4 h-4 text-accent" />
      </label>

      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 rounded-full bg-accent text-accent-foreground font-bold text-sm disabled:opacity-50 hover:opacity-90 active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2"
      >
        {loading ? "Joining…" : <>Join the waitlist <ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-[11px] text-muted-foreground text-center">
        We'll only use your contact info to notify you about launch.
      </p>
    </form>
  );
};

/* ───────────────── In-app mock screens (mirror real UI) ───────────────── */

// Mirrors Discover.tsx — 96px-tall card, cyan match ring with Zap, location text
const DiscoverMock = () => {
  const matches = [
    { name: "Marcus Chen", age: 28, loc: "Singapore", pct: 94, initials: "MC" },
    { name: "Aaliyah Reed", age: 31, loc: "London, UK", pct: 87, initials: "AR" },
    { name: "Diego Alvarez", age: 26, loc: "Madrid, Spain", pct: 82, initials: "DA" },
  ];
  return (
    <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div className="w-9" />
        <span className="text-[18px] font-black tracking-tight text-foreground">TradersWorld</span>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent" />
      </div>
      <div className="py-3 flex items-center justify-center">
        <img src={authGlobe} alt="" className="w-[160px] h-[160px] object-contain" />
      </div>
      <h2 className="px-5 text-[18px] font-black text-foreground">Some curated matches for you!</h2>
      <div className="px-5 pt-3 pb-5 space-y-3">
        {matches.map((m, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden flex items-stretch h-[88px]">
            <div className="w-[88px] h-full shrink-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">{m.initials}</span>
            </div>
            <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center gap-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] font-bold text-accent truncate">{m.name}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-[13px] text-foreground font-bold">{m.age}</span>
                </div>
                <div className="shrink-0 flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <div className="relative w-[20px] h-[20px]">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${(m.pct / 100) * 100.53} 100.53`} />
                      </svg>
                      <Zap className="absolute inset-0 m-auto w-2.5 h-2.5 text-accent" fill="currentColor" strokeWidth={0} />
                    </div>
                    <span className="text-[14px] font-black text-foreground">{m.pct}%</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Match</span>
                </div>
              </div>
              <div className="text-[12px] text-foreground/90 truncate">{m.loc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mirrors PulseSession.tsx — "PULSE SESSION" eyebrow + Live pill + bubble messages
const PulseMock = () => (
  <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl">
    <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3">
      <div className="h-8 w-8 rounded-full bg-secondary" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Pulse Session</p>
        <p className="truncate text-[13px] font-semibold text-foreground">Chat + voice notes · async</p>
      </div>
      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Live</span>
    </div>
    <div className="px-4 py-5 space-y-2 min-h-[300px]">
      <div className="flex justify-start">
        <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-secondary text-foreground px-3 py-1.5 text-[12px]">
          ES looking heavy at 5240 — might short the rejection.
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-1.5 text-[12px]">
          Same view here. Waiting for VWAP reclaim fail.
        </div>
      </div>
      <div className="flex justify-start">
        <div className="rounded-2xl rounded-bl-md bg-secondary text-foreground px-3 py-2 text-[12px] flex items-center gap-2">
          <Mic className="w-3.5 h-3.5 text-accent" />
          <div className="flex items-end gap-0.5">
            {[3,5,8,4,6,9,5,3,7,5].map((h,i)=>(
              <span key={i} className="w-0.5 bg-accent rounded-full" style={{height:`${h*2}px`}} />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">0:14</span>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-1.5 text-[12px]">
          In short. 5238. Stop above HOD.
        </div>
      </div>
    </div>
    <div className="border-t border-border bg-card/80 px-3 py-2 flex items-center gap-2">
      <div className="flex-1 rounded-full border border-border bg-secondary px-3 py-2 text-[12px] text-muted-foreground">Message…</div>
      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
        <Mic className="w-3.5 h-3.5 text-accent-foreground" />
      </div>
    </div>
  </div>
);

// Mirrors Onboarding.tsx — big bold title with cyan accent word + globe stepper feel
const OnboardingMock = () => (
  <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl px-7 py-10 min-h-[520px]">
    <div className="flex items-end justify-between mb-8">
      <h2 className="text-[24px] font-bold text-foreground tracking-tight leading-tight max-w-[200px]">
        Tell us your trading <span className="text-accent font-bold">style</span>
      </h2>
      <div className="relative w-[56px] h-[56px] shrink-0">
        <img src={authGlobe} alt="" className="w-full h-full object-contain opacity-90" />
      </div>
    </div>
    <div className="text-[13px] text-muted-foreground mb-3">Markets</div>
    <div className="flex flex-wrap gap-2 mb-6">
      {["Forex","Futures","Options","Crypto"].map((m,i) => (
        <span key={i} className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border ${i<2?"bg-accent text-accent-foreground border-accent":"bg-secondary text-muted-foreground border-border"}`}>{m}</span>
      ))}
    </div>
    <div className="text-[13px] text-muted-foreground mb-3">Sessions</div>
    <div className="flex flex-wrap gap-2 mb-6">
      {["London","New York","Asian"].map((m,i) => (
        <span key={i} className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border ${i===1?"bg-accent text-accent-foreground border-accent":"bg-secondary text-muted-foreground border-border"}`}>{m}</span>
      ))}
    </div>
    <div className="text-[13px] text-muted-foreground mb-3">Style</div>
    <div className="flex flex-wrap gap-2">
      {["Day","Swing","Scalp"].map((m,i) => (
        <span key={i} className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border ${i===0?"bg-accent text-accent-foreground border-accent":"bg-secondary text-muted-foreground border-border"}`}>{m}</span>
      ))}
    </div>
  </div>
);

// Mirrors Feed.tsx — stories row + market filter pills + post card
const FeedMock = () => (
  <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl">
    <div className="px-5 pt-5 flex items-center justify-between">
      <span className="text-[18px] font-black tracking-tight text-foreground">TradersWorld</span>
      <Bell className="w-5 h-5 text-foreground" />
    </div>
    {/* Stories */}
    <div className="px-4 pt-4 pb-2 flex gap-3 overflow-hidden">
      {["You","MC","AR","DA","JT"].map((s,i) => (
        <div key={i} className="flex flex-col items-center gap-1 shrink-0">
          <div className={`w-14 h-14 rounded-full p-[2px] ${i===0?"bg-border":"bg-gradient-to-tr from-accent to-primary"}`}>
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-[11px] font-bold text-foreground">{s}</div>
          </div>
          <span className="text-[10px] text-muted-foreground">{s}</span>
        </div>
      ))}
    </div>
    {/* Filters */}
    <div className="px-4 pb-2 flex gap-2 overflow-hidden">
      {["All","Forex","Futures","Crypto"].map((f,i) => (
        <span key={i} className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${i===0?"bg-accent text-accent-foreground border-accent":"bg-secondary text-muted-foreground border-border"}`}>{f}</span>
      ))}
    </div>
    {/* Post */}
    <div className="px-4 pb-4">
      <div className="border-t border-border pt-4 flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent" />
        <div className="flex-1">
          <div className="text-[12px] font-bold text-foreground">marcus.chen</div>
          <div className="text-[10px] text-muted-foreground">2h · Futures</div>
        </div>
      </div>
      <div className="aspect-square rounded-xl bg-gradient-to-br from-secondary via-card to-secondary flex items-center justify-center border border-border">
        <Activity className="w-10 h-10 text-accent/40" />
      </div>
      <div className="flex items-center gap-4 mt-3">
        <Heart className="w-5 h-5 text-foreground" />
        <MessageSquare className="w-5 h-5 text-foreground" />
      </div>
      <div className="text-[12px] text-foreground mt-2">
        <span className="font-bold">marcus.chen</span> Clean breakout on ES. Took +2R.
      </div>
    </div>
  </div>
);

/* ───────────────── Page ───────────────── */
const Landing = () => {
  const navigate = useNavigate();
  const [betaOpen, setBetaOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [navShadow, setNavShadow] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle();
      navigate(profile?.onboarding_completed ? "/feed" : "/onboarding");
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles").select("onboarding_completed").eq("id", session.user.id).maybeSingle();
        navigate(profile?.onboarding_completed ? "/feed" : "/onboarding");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setNavShadow(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="dark min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-[100] bg-background/85 backdrop-blur-xl border-b border-border transition-all"
        style={{ boxShadow: navShadow ? "0 4px 24px rgba(0,0,0,0.45)" : "none" }}
      >
        <div className="max-w-[1180px] mx-auto px-6 sm:px-8 h-[64px] flex items-center justify-between">
          <a href="#" className="flex items-center"><Wordmark size="text-lg" /></a>
          <div className="hidden md:flex items-center gap-9">
            <button onClick={() => scrollTo("preview")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Inside the app</button>
            <button onClick={() => scrollTo("features")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollTo("waitlist")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Waitlist</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBetaOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-[13px] font-semibold text-foreground hover:border-accent hover:text-accent transition-all"
            >
              <KeyRound className="w-3.5 h-3.5" /> Beta key
            </button>
            <button
              onClick={() => scrollTo("waitlist")}
              className="px-4 py-2 rounded-full bg-accent text-accent-foreground text-[13px] font-bold hover:opacity-90 transition-opacity"
            >
              Join waitlist
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-[120px] pb-16 px-6 sm:px-8 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px]" />
        </div>
        <div className="max-w-[1180px] mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-[11px] font-bold text-accent uppercase tracking-wider mb-6">
                <Sparkles className="w-3 h-3" /> Closed beta · launching soon
              </div>
              <h1 className="text-[44px] sm:text-[56px] lg:text-[64px] font-black leading-[1.02] tracking-tight text-foreground mb-6">
                You're not <br/>trading <span className="text-accent">alone.</span>
              </h1>
              <p className="text-[17px] text-muted-foreground leading-relaxed max-w-[480px] mb-8">
                TradersWorld is the accountability platform for serious traders. Get matched 1-on-1 with a partner who trades your markets, your sessions, your style — and grow together.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => scrollTo("waitlist")}
                  className="px-6 py-3.5 rounded-full bg-accent text-accent-foreground font-bold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Join the waitlist <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setBetaOpen(true)}
                  className="px-6 py-3.5 rounded-full border border-border text-foreground font-bold text-sm inline-flex items-center gap-2 hover:border-accent hover:text-accent transition-all"
                >
                  <KeyRound className="w-4 h-4" /> I have a beta key
                </button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-[12px] text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> 1-on-1 partnerships</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Built for accountability</div>
              </div>
            </div>
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full" />
              <img src={authGlobe} alt="TradersWorld globe" className="relative w-full max-w-[480px] object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── INSIDE THE APP — real screen mocks ─── */}
      <section id="preview" className="py-20 px-6 sm:px-8 bg-card/30 border-y border-border">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">Inside the app</div>
            <h2 className="text-[36px] sm:text-[44px] font-black tracking-tight text-foreground">
              Built for <span className="text-accent">real traders.</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-[560px] mx-auto text-[15px]">
              Every screen is designed around one thing: helping you stay accountable, focused, and connected.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-2">Discover</div>
              <h3 className="text-[24px] font-bold text-foreground mb-2">Curated 1-on-1 matches</h3>
              <p className="text-[14px] text-muted-foreground mb-6 max-w-[420px]">
                A 100-point algorithm matches you on markets, sessions, style, experience and goals. No swiping. Quality over quantity.
              </p>
              <DiscoverMock />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-2">Pulse</div>
              <h3 className="text-[24px] font-bold text-foreground mb-2">Async chat + voice notes</h3>
              <p className="text-[14px] text-muted-foreground mb-6 max-w-[420px]">
                Talk through setups in real time without the pressure of a live call. Send a voice note, get a sanity check.
              </p>
              <PulseMock />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-2">Onboarding</div>
              <h3 className="text-[24px] font-bold text-foreground mb-2">Built around your style</h3>
              <p className="text-[14px] text-muted-foreground mb-6 max-w-[420px]">
                A 7-step trader profile so you only ever see partners who actually fit how you trade.
              </p>
              <OnboardingMock />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-2">Feed</div>
              <h3 className="text-[24px] font-bold text-foreground mb-2">A community feed, no noise</h3>
              <p className="text-[14px] text-muted-foreground mb-6 max-w-[420px]">
                Stories, market-filtered posts, and partner activity. Media-only — text-only spam doesn't get a stage.
              </p>
              <FeedMock />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 px-6 sm:px-8">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">Everything you need</div>
            <h2 className="text-[36px] sm:text-[44px] font-black tracking-tight text-foreground">
              One platform for the <span className="text-accent">whole journey.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Users, title: "1-on-1 Partnerships", body: "Match, request, accept — and grow together. Unmatch or block any time." },
              { icon: Zap, title: "100-Point Match Algorithm", body: "Markets, sessions, style, experience, goals — weighted to surface real fits." },
              { icon: MessageSquare, title: "Pulse Sessions", body: "Async chat and voice notes for partners who trade different timezones." },
              { icon: BookOpen, title: "Trading Log", body: "Track every entry with green/red performance tags. Build your edge in public." },
              { icon: Activity, title: "Live Feed & Stories", body: "Media-first community — stories, posts, market filters, partner activity." },
              { icon: Bell, title: "Accountability Alerts", body: "Win 🟢 Loss 🔴 Break-even ⚪ — your partner sees the pulse, not the P&L." },
              { icon: GlobeIcon, title: "Forums by Market", body: "Dedicated Forex, Futures and Options spaces. Discuss without the algorithm." },
              { icon: Shield, title: "Privacy & Safety", body: "Block, report, and full account-deletion controls. RLS on every table." },
              { icon: TrendingUp, title: "Profiles That Mean Something", body: "Verified badges, trading style, recent activity. Built for traders, not influencers." },
            ].map((f, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <div className="text-[15px] font-bold text-foreground mb-1">{f.title}</div>
                <div className="text-[13px] text-muted-foreground leading-relaxed">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WAITLIST ─── */}
      <section id="waitlist" className="py-24 px-6 sm:px-8 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px]" />
        </div>
        <div className="max-w-[640px] mx-auto relative">
          <div className="text-center mb-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">Join the waitlist</div>
            <h2 className="text-[34px] sm:text-[40px] font-black tracking-tight text-foreground mb-3">
              Be first when we <span className="text-accent">go live.</span>
            </h2>
            <p className="text-muted-foreground text-[15px] max-w-[440px] mx-auto">
              We're rolling out access in waves. Drop your details and we'll let you know the moment your spot opens.
            </p>
          </div>
          {submitted ? (
            <div className="bg-card border border-accent/40 rounded-3xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-[22px] font-black text-foreground mb-2">You're on the list!</h3>
              <p className="text-muted-foreground text-[14px]">
                We'll email you the moment a spot opens up. If you opted in for the beta, expect an invite soon.
              </p>
            </div>
          ) : (
            <WaitlistForm onSuccess={() => setSubmitted(true)} />
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border py-10 px-6 sm:px-8">
        <div className="max-w-[1180px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wordmark size="text-base" />
            <span className="text-[12px] text-muted-foreground">© {new Date().getFullYear()} TradersWorld</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="/privacy" className="text-[12px] text-muted-foreground hover:text-foreground">Privacy</a>
            <a href="/terms" className="text-[12px] text-muted-foreground hover:text-foreground">Terms</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Instagram className="w-4 h-4" /></a>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><XIcon className="w-4 h-4" /></a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Youtube className="w-4 h-4" /></a>
          </div>
        </div>
      </footer>

      <BetaKeyModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </div>
  );
};

export default Landing;
