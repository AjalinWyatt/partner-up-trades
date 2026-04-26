import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, KeyRound, Sparkles, Zap, Users, MessageSquare,
  TrendingUp, Bell, Heart, Shield, Activity, Mic, BookOpen,
  Globe as GlobeIcon, Instagram, Youtube, CheckCircle2, X as XClose,
  Bot, GraduationCap, Megaphone, UserCheck, ChevronLeft, Bookmark, ChevronsUp, ChevronsDown, Gem, Plus, Send, Menu,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Wordmark from "@/components/Wordmark";
import InstallAppBanner from "@/components/InstallAppBanner";
// Use the lightweight, preloaded PNG instead of the 3MB SVG
// so the hero globe is already in cache before React mounts.
const authGlobe = "/auth-globe.png?v=3";
import mockMarcus from "@/assets/mock-marcus.jpg";
import mockAaliyah from "@/assets/mock-aaliyah.jpg";
import mockDiego from "@/assets/mock-diego.jpg";
import mockNilaja from "@/assets/nilaja-founder.jpg";
import mockJt from "@/assets/mock-jt.jpg";
import mockKw from "@/assets/mock-kw.jpg";

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
            type="text" value={key} onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="xxxx-xxxx-xxxx" autoFocus
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent mb-3 font-mono tracking-wider"
          />
          <button
            onClick={submit} disabled={loading || !key.trim()}
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

/* ───────────────── Waitlist form (simplified) ───────────────── */
const WaitlistForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [wantsBeta, setWantsBeta] = useState(false);
  const [loading, setLoading] = useState(false);

  const MARKET_OPTIONS = ["Forex", "Futures", "Options"];
  const toggleMarket = (m: string) =>
    setMarkets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Please enter your name"); return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email"); return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid phone number"); return;
    }
    if (markets.length === 0) {
      toast.error("Pick at least one market you trade"); return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist" as any).insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      wants_beta: wantsBeta,
      markets,
      market: markets[0],
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
    <form onSubmit={submit} className="bg-card border border-border rounded-3xl p-6 sm:p-7 space-y-4" autoComplete="on" name="waitlist">
      <div>
        <label htmlFor="waitlist-name" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Name *</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name" required maxLength={80}
          name="name" id="waitlist-name" autoComplete="name"
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent transition-colors"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="waitlist-email" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email *</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com" required
            name="email" id="waitlist-email" autoComplete="email" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label htmlFor="waitlist-phone" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Phone *</label>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+1 555 000 0000" required
            name="phone" id="waitlist-phone" autoComplete="tel" inputMode="tel"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Which markets do you trade? * <span className="text-muted-foreground/70 normal-case tracking-normal font-medium">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {MARKET_OPTIONS.map(m => {
            const active = markets.includes(m);
            return (
              <button
                key={m} type="button" onClick={() => toggleMarket(m)}
                className={`px-4 py-2 rounded-full border text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-accent/15 border-accent text-accent"
                    : "bg-secondary border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
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
          <span className="block text-[13px] font-bold text-foreground">I want to be an early beta tester</span>
          <span className="block text-[11px] text-muted-foreground mt-0.5">Get access before public launch + help shape the platform.</span>
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

/* ───────────────── In-app mock screens ───────────────── */

// FEED - Feed/Pulse tabs, market filter pills, post cards
const FeedMock = () => {
  const posts = [
    { name: "@Nilaja - CEO | FOUNDER", photo: mockNilaja, time: "1d ago", tags: ["Forex", "Advanced"],
      body: "Any feedback thus far? Whoever has access to this, please go through as much as you can and if anything ANYTHING messes up - tell me asap! I don't care how much you critique me. I need every little issue reported please <3",
      hashtags: ["#Forex", "#Rant"], comments: 1 },
    { name: "marcus.chen", photo: mockMarcus, time: "2h", tags: ["Futures", "Day"],
      body: "Clean breakout on ES at 5240. Took +2R. Stuck to plan today - no revenge entries.",
      hashtags: ["#Futures", "#WinDay"], comments: 4 },
  ];
  return (
    <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-5 pt-5 flex items-center justify-between">
        <span className="text-[16px] font-black tracking-tight text-foreground">TradersWorld</span>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-foreground" /></div>
          <img src={mockNilaja} alt="" className="w-7 h-7 rounded-full object-cover" />
        </div>
      </div>
      {/* Feed/Pulse tabs */}
      <div className="px-5 pt-3 pb-2 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-card p-0.5">
          <span className="px-5 py-1.5 rounded-full bg-accent/10 border border-accent/40 text-[12px] font-bold text-foreground">Feed</span>
          <span className="px-5 py-1.5 text-[12px] font-semibold text-muted-foreground">Pulse</span>
        </div>
      </div>
      {/* Market filter pills */}
      <div className="px-4 pt-2 pb-3 flex gap-1.5 overflow-hidden border-b border-border">
        {["All","Crypto","Forex","Indices","Futures"].map((f,i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap ${i===0?"border-accent text-accent bg-accent/5":"border-border text-muted-foreground bg-secondary"}`}>{f}</span>
        ))}
      </div>
      {/* Posts */}
      <div className="p-3 space-y-3 max-h-[440px] overflow-hidden">
        {posts.map((p, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-3">
            <div className="flex items-start gap-2.5 mb-2">
              <img src={p.photo} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] font-bold text-foreground truncate">{p.name}</div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{p.time}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {p.tags.map((t, j) => (
                    <span key={j} className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-[9px] font-bold text-accent">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-[12px] text-foreground/90 leading-snug mb-2">{p.body}</div>
            <div className="flex items-center gap-1.5 mb-2">
              {p.hashtags.map((h, j) => (
                <span key={j} className="px-2 py-0.5 rounded-full bg-secondary border border-border text-[10px] text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground border-t border-border pt-2">
              <Heart className="w-4 h-4" />
              <div className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /><span className="text-[10px]">{p.comments}</span></div>
              <Send className="w-4 h-4" />
              <Bookmark className="w-4 h-4 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// PULSE - main landing screen (globe, online count, Need Help toggle, what's going on pills)
const PulseMock = () => {
  const reasons = ["Bad Loss", "Revenge Trading", "Anxiety", "Need Perspective", "Lonely Journey", "Pre-Trade Check", "Just Need to Talk"];
  return (
    <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-5 pt-5 flex items-center justify-between">
        <span className="text-[16px] font-black tracking-tight text-foreground">TradersWorld</span>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-foreground" /></div>
          <img src={mockNilaja} alt="" className="w-7 h-7 rounded-full object-cover" />
        </div>
      </div>
      {/* Feed/Pulse tabs */}
      <div className="px-5 pt-3 pb-3 flex justify-center border-b border-border">
        <div className="inline-flex rounded-full border border-border bg-card p-0.5">
          <span className="px-5 py-1.5 text-[12px] font-semibold text-muted-foreground">Feed</span>
          <span className="px-5 py-1.5 rounded-full bg-accent/10 border border-accent/40 text-[12px] font-bold text-foreground">Pulse</span>
        </div>
      </div>
      {/* Pulse intro */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-border bg-card/50 p-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent mb-1">Pulse</div>
          <div className="text-[12px] text-muted-foreground">Real-time peer connection with traders online right now.</div>
        </div>
      </div>
      {/* Globe + online count */}
      <div className="flex flex-col items-center pt-4 pb-2">
        <img src={authGlobe} alt="" className="w-[120px] h-[120px] object-contain animate-globe-float motion-reduce:animate-none" />
        <div className="mt-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-[14px] font-black text-foreground">16</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">Traders</span>
        </div>
      </div>
      {/* Need Help card */}
      <div className="px-4 pt-3 pb-4">
        <div className="rounded-2xl border border-accent/30 bg-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full border border-accent/40 bg-accent/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Need Help</div>
              <div className="text-[13px] font-bold text-foreground">I need someone right now</div>
            </div>
            <div className="w-9 h-5 rounded-full bg-accent/30 relative">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-accent" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mb-3">Send a Pulse to traders online. First one to answer connects with you privately.</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2">
            What's going on? <span className="text-destructive normal-case tracking-normal">(required)</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {reasons.map((r, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full border border-border bg-secondary text-[10px] text-muted-foreground">{r}</span>
            ))}
          </div>
          <button className="w-full py-2.5 rounded-full bg-accent text-accent-foreground font-bold text-[12px] inline-flex items-center justify-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Send Pulse
          </button>
          <div className="text-[9px] text-muted-foreground text-center mt-2">Sessions include chat + voice notes.</div>
        </div>
      </div>
    </div>
  );
};

// PULSE HELPER - "Available to Help" side, showing incoming Pulse requests waiting to be answered
const PulseHelperMock = () => {
  const incoming = [
    { name: "Marcus C.", reason: "Bad Loss", time: "12s", photo: mockMarcus, market: "Forex" },
    { name: "Aaliyah R.", reason: "Revenge Trading", time: "38s", photo: mockAaliyah, market: "Futures" },
    { name: "Diego A.", reason: "Pre-Trade Check", time: "1m", photo: mockDiego, market: "Crypto" },
    { name: "JT", reason: "Anxiety", time: "2m", photo: mockJt, market: "Forex" },
    { name: "KW", reason: "Need Perspective", time: "3m", photo: mockKw, market: "Indices" },
    { name: "Sana M.", reason: "Lonely Journey", time: "4m", initials: "SM", market: "Crypto" },
    { name: "Theo B.", reason: "Just Need to Talk", time: "5m", initials: "TB", market: "Forex" },
    { name: "Riya P.", reason: "Bad Loss", time: "7m", initials: "RP", market: "Options" },
  ];
  return (
    <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-5 pt-5 flex items-center justify-between">
        <span className="text-[16px] font-black tracking-tight text-foreground">TradersWorld</span>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-foreground" /></div>
          <img src={mockNilaja} alt="" className="w-7 h-7 rounded-full object-cover" />
        </div>
      </div>
      {/* Feed/Pulse tabs */}
      <div className="px-5 pt-3 pb-3 flex justify-center border-b border-border">
        <div className="inline-flex rounded-full border border-border bg-card p-0.5">
          <span className="px-5 py-1.5 text-[12px] font-semibold text-muted-foreground">Feed</span>
          <span className="px-5 py-1.5 rounded-full bg-accent/10 border border-accent/40 text-[12px] font-bold text-foreground">Pulse</span>
        </div>
      </div>
      {/* Help Others header strip */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-center gap-2">
          <span className="h-px flex-1 bg-accent/20" />
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Help Others</span>
          <span className="h-px flex-1 bg-accent/20" />
        </div>
      </div>
      {/* Available to Help toggle row */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-accent/30 bg-card p-3.5 [background-image:linear-gradient(180deg,hsl(var(--accent)/0.06),transparent_60%)]">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-foreground">Available to Help</div>
              <div className="text-[10px] text-muted-foreground">You'll see Pulses from traders who need someone.</div>
            </div>
            <div className="w-9 h-5 rounded-full bg-accent/30 relative shrink-0">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
            </div>
          </div>
        </div>
      </div>
      {/* Incoming Pulses */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">Incoming Pulses</div>
          <div className="text-[10px] font-semibold text-muted-foreground">{incoming.length} waiting</div>
        </div>
        <ul className="space-y-1.5 max-h-[260px] overflow-hidden">
          {incoming.map((p, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2">
              {p.photo ? (
                <img src={p.photo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-accent">{p.initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-foreground truncate">{p.name}</span>
                  <span className="px-1.5 py-px rounded-full bg-secondary border border-border text-[8px] font-bold text-muted-foreground">{p.market}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  <span className="text-accent font-semibold">{p.reason}</span> · {p.time} ago
                </div>
              </div>
              <button className="shrink-0 rounded-full bg-accent text-accent-foreground px-2.5 py-1 text-[10px] font-bold inline-flex items-center gap-1">
                <Activity className="w-3 h-3" /> Connect
              </button>
            </li>
          ))}
        </ul>
        <div className="text-[9px] text-muted-foreground text-center mt-2.5">First to accept connects. Others see "This Pulse has already been answered."</div>
      </div>
    </div>
  );
};

// DISCOVER - list of curated matches
const DiscoverMock = () => {
  const matches = [
    { name: "Marcus Chen", age: 28, loc: "Singapore", pct: 94, photo: mockMarcus },
    { name: "Aaliyah Reed", age: 31, loc: "London, UK", pct: 87, photo: mockAaliyah },
    { name: "Diego Alvarez", age: 26, loc: "Madrid, Spain", pct: 82, photo: mockDiego },
  ];
  return (
    <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div className="w-9" />
        <span className="text-[18px] font-black tracking-tight text-foreground">TradersWorld</span>
        <img src={mockNilaja} alt="" className="w-9 h-9 rounded-full object-cover" />
      </div>
      <div className="py-3 flex items-center justify-center">
        <img src={authGlobe} alt="" className="w-[140px] h-[140px] object-contain animate-globe-float motion-reduce:animate-none" />
      </div>
      <h2 className="px-5 text-[16px] font-black text-foreground">Some curated matches for you</h2>
      <div className="px-5 pt-3 pb-5 space-y-3">
        {matches.map((m, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden flex items-stretch h-[88px]">
            <img src={m.photo} alt={m.name} className="w-[88px] h-full shrink-0 object-cover" />
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

// MATCH PROFILE - full why-we-match card
const MatchProfileMock = () => {
  const pct = 94;
  const dasharray = `${(pct / 100) * 100.53} 100.53`;
  const reasons = [
    "Both trade Futures",
    "Shared strategy: Smart Money/ICT, Order Flow",
    "Active in the same Asian session",
    "Common timeframe: 4H-Daily, 1-30m, 1H-2H",
    "Trade the same instruments: ES, NQ",
    "Same experience level: Advanced",
    "Same goal: Go full-time",
    "Relate on: Revenge trading, Moving stop loss",
    "Shared interests: Reading",
  ];
  return (
    <div className="w-full max-w-[340px] mx-auto bg-background border border-border rounded-[28px] overflow-hidden shadow-2xl">
      <div className="px-4 pt-4 flex items-center justify-between">
        <ChevronLeft className="w-5 h-5 text-foreground" />
        <span className="text-[16px] font-black tracking-tight text-foreground">TradersWorld</span>
        <Bookmark className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex flex-col items-center pt-4 pb-3">
        <div className="relative w-[110px] h-[110px] mb-3">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
            <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" strokeDasharray={dasharray} />
          </svg>
          <img src={mockMarcus} alt="Marcus Chen" className="absolute inset-[6px] rounded-full object-cover" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[18px] font-black text-foreground">Marcus Chen</span>
          <Gem className="w-4 h-4 text-accent" />
        </div>
        <div className="text-[12px] text-muted-foreground">28 · Singapore</div>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-center px-4">
          <span className="px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/40 text-[10px] font-bold text-accent">Singapore</span>
          <span className="px-2.5 py-0.5 rounded-full border border-border bg-secondary text-[10px] font-semibold text-foreground">Male</span>
          <span className="px-2.5 py-0.5 rounded-full border border-border bg-secondary text-[10px] font-semibold text-foreground">Futures Trader</span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/40">
          <Zap className="w-3 h-3 text-accent" fill="currentColor" />
          <span className="text-[12px] font-black text-accent">{pct}% Match</span>
        </div>
      </div>

      <div className="px-5 pb-3">
        <div className="text-[13px] font-black text-foreground mb-2">Why We Match</div>
        <div className="space-y-1.5">
          {reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/90">
              <span className="w-1 h-1 rounded-full bg-accent shrink-0 mt-1.5" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5 flex items-center justify-around border-t border-border pt-3">
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center"><ChevronsDown className="w-4 h-4 text-muted-foreground" /></div>
          <span className="text-[9px] text-muted-foreground">Pass</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center"><Bookmark className="w-4 h-4 text-muted-foreground" /></div>
          <span className="text-[9px] text-muted-foreground">Save</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center"><ChevronsUp className="w-5 h-5 text-accent-foreground" /></div>
          <span className="text-[9px] text-foreground font-bold">Send Request</span>
        </div>
      </div>
    </div>
  );
};

/* ───────────────── Page ───────────────── */
const Landing = () => {
  const navigate = useNavigate();
  const [betaOpen, setBetaOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [navShadow, setNavShadow] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      <InstallAppBanner />
      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-[100] bg-background/85 backdrop-blur-xl border-b border-border transition-all"
        style={{ boxShadow: navShadow ? "0 4px 24px rgba(0,0,0,0.45)" : "none" }}
      >
        <div className="max-w-[1180px] mx-auto px-6 sm:px-8 h-[64px] flex items-center justify-between">
          <a href="#" className="flex items-center"><Wordmark size="text-lg" /></a>
          <div className="hidden md:flex items-center gap-9">
            <button onClick={() => scrollTo("preview")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Inside the app</button>
            <button onClick={() => scrollTo("manifesto")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Why us</button>
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
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(v => !v)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-border text-foreground hover:border-accent hover:text-accent transition-all"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="max-w-[1180px] mx-auto px-6 sm:px-8 py-3 flex flex-col">
              {[
                { id: "preview", label: "Inside the app" },
                { id: "manifesto", label: "Why us" },
                { id: "features", label: "Features" },
                { id: "waitlist", label: "Waitlist" },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => { setMobileNavOpen(false); scrollTo(item.id); }}
                  className="text-left text-sm font-medium text-foreground/90 hover:text-accent py-3 border-b border-border/50 last:border-b-0 transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { setMobileNavOpen(false); setBetaOpen(true); }}
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-[13px] font-semibold text-foreground hover:border-accent hover:text-accent transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" /> I have a beta key
              </button>
            </div>
          </div>
        )}
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
                Real peer accountability. No mentors selling you their dream. No course funnels. No AI pretending to care. Just a human partner who trades like you and shows up when it counts.
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
                <button
                  onClick={() => scrollTo("preview")}
                  className="px-6 py-3.5 rounded-full text-foreground font-bold text-sm inline-flex items-center gap-2 hover:text-accent transition-colors"
                >
                  See how it works <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> 1-on-1 partnerships</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Human, not AI</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Zero course pitches</div>
              </div>
            </div>
            <div className="relative flex items-center justify-center">
              <img
                src={authGlobe}
                alt="TradersWorld globe"
                fetchPriority="high"
                decoding="async"
                width={480}
                height={480}
                className="relative w-full max-w-[480px] object-contain animate-globe-drift motion-reduce:animate-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── MANIFESTO - what we're NOT ─── */}
      <section id="manifesto" className="py-20 px-6 sm:px-8 border-y border-border bg-card/30">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">What TradersWorld is not</div>
            <h2 className="text-[36px] sm:text-[44px] font-black tracking-tight text-foreground">
              Trading help is broken. <br/><span className="text-accent">We're fixing it.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { icon: GraduationCap, title: "No mentors", body: "No one selling you their $5k course or DMing you to 'get on a call'." },
              { icon: Megaphone, title: "No noisy community", body: "Not a Discord with 12,000 strangers spamming strategies that don't fit yours." },
              { icon: Bot, title: "No AI 'coach'", body: "Real human accountability. A real person who actually cares about your week." },
              { icon: TrendingUp, title: "No P&L flexing", body: "Wins, losses, break-evens - the work, not the highlight reel." },
            ].map((f, i) => (
              <div key={i} className="bg-background border border-border rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                  <XClose className="w-3.5 h-3.5 text-destructive" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-[15px] font-bold text-foreground mb-1">{f.title}</div>
                <div className="text-[13px] text-muted-foreground leading-relaxed">{f.body}</div>
              </div>
            ))}
          </div>

          <div className="bg-background border border-accent/40 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-accent/15 blur-[100px] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-[11px] font-bold text-accent uppercase tracking-wider mb-4">
                <UserCheck className="w-3 h-3" /> What we are
              </div>
              <h3 className="text-[26px] sm:text-[32px] font-black text-foreground mb-3 tracking-tight leading-tight">
                Real Human. Real Partnership. Real Accountability. <br/><span className="text-accent">= Real Change.</span>
              </h3>
              <p className="text-muted-foreground text-[15px] max-w-[640px] mx-auto leading-relaxed">
                You get matched 1-on-1 with another trader who runs your markets, your sessions, your style. Build one real partnership - or a few - with people who actually show up. You hold each other accountable. You journal together. No gurus. No bots. No bullshit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS - LIFECYCLE ─── */}
      {/* ─── INSIDE THE APP ─── */}
      <section id="preview" className="py-24 px-6 sm:px-8">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">Inside the app</div>
            <h2 className="text-[36px] sm:text-[44px] font-black tracking-tight text-foreground">
              See it in <span className="text-accent">action.</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-[560px] mx-auto text-[15px]">
              Three real screens from inside TradersWorld - no mockups, no marketing fluff.
            </p>
          </div>

          <div className="space-y-24">
            {/* FEED */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-1 lg:order-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">Feed</div>
                <h3 className="text-[28px] sm:text-[34px] font-black text-foreground mb-4 tracking-tight">A community feed without the noise.</h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed mb-5">
                  Stories from your partners. Posts filtered by the markets you actually trade. Real wins, real losses, real break-evens - tagged so the work shows, not the flex.
                </p>
                <ul className="space-y-2 text-[13px] text-foreground/90">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" /> Stories from people you actually partner with</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" /> Filter by market - Forex, Futures, Crypto, Options</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" /> Win 🟢 / Loss 🔴 / Break ⚪ tags built in</li>
                </ul>
              </div>
              <div className="order-2 lg:order-2"><FeedMock /></div>
            </div>

            {/* PULSE */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
                <PulseMock />
                <PulseHelperMock />
              </div>
              <div className="order-1 lg:order-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">Pulse</div>
                <h3 className="text-[28px] sm:text-[34px] font-black text-foreground mb-4 tracking-tight">Async chat + voice notes with your partner.</h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed mb-5">
                  Two sides of one moment. A trader sends a Pulse when they need someone right now - context tagged so you know what they're walking into. Available helpers see it instantly and the first to accept connects privately. Async chat and voice notes when it actually matters.
                </p>
                <ul className="space-y-2 text-[13px] text-foreground/90">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" /> Send a Pulse with the context that matters - Bad Loss, Pre-Trade Check, Anxiety</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" /> Available traders see it live - first to accept connects 1-on-1</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" /> Async chat + voice notes - no scheduling pressure</li>
                </ul>
              </div>
            </div>

            {/* DISCOVER + MATCH PROFILE */}
            <div>
              <div className="text-center mb-10">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">Discover</div>
                <h3 className="text-[28px] sm:text-[34px] font-black text-foreground mb-3 tracking-tight">Curated 1-on-1 matches - and the receipts.</h3>
                <p className="text-[15px] text-muted-foreground max-w-[560px] mx-auto leading-relaxed">
                  A 100-point algorithm scores every potential partner on the things that actually matter. Tap any match to see exactly why they showed up.
                </p>
              </div>
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                <DiscoverMock />
                <MatchProfileMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 px-6 sm:px-8 bg-card/30 border-y border-border">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent mb-3">Everything inside</div>
            <h2 className="text-[36px] sm:text-[44px] font-black tracking-tight text-foreground">
              One platform for the <span className="text-accent">whole journey.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Users, title: "1-on-1 Partnerships", body: "Match, request, accept - and grow together. Unmatch or block any time." },
              { icon: Zap, title: "100-Point Match Algorithm", body: "Markets, sessions, style, experience, goals - weighted to surface real fits." },
              { icon: MessageSquare, title: "Pulse Sessions", body: "Async chat and voice notes for partners across any timezone." },
              { icon: BookOpen, title: "Trading Log", body: "Track every entry with green/red/break-even tags. Build your edge in public - or in private." },
              { icon: Activity, title: "Live Feed & Stories", body: "Media-first community - stories, posts, market filters, partner activity." },
              { icon: Bell, title: "Accountability Alerts", body: "Win 🟢 Loss 🔴 Break ⚪ - your partner sees the pulse, not the P&L." },
              { icon: GlobeIcon, title: "Forums by Market", body: "Dedicated Forex, Futures and Options spaces. Discuss without the algorithm." },
              { icon: Shield, title: "Privacy & Safety", body: "Block, report, and full account-deletion controls. Your data, your call." },
              { icon: TrendingUp, title: "Profiles That Mean Something", body: "Verified badges, trading style, recent activity. Built for traders, not influencers." },
            ].map((f, i) => (
              <div key={i} className="bg-background border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors">
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
              We're rolling out access in waves. Drop your details and we'll let you know the moment your spot opens. Want in early? Tick the beta box.
            </p>
          </div>
          {submitted ? (
            <div className="bg-card border border-accent/40 rounded-3xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-[22px] font-black text-foreground mb-2">You're on the list.</h3>
              <p className="text-muted-foreground text-[14px]">
                We'll email you the moment a spot opens. If you opted in for the beta, expect an invite soon.
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
            <a href="https://www.instagram.com/tradersworldapp/" target="_blank" rel="noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-foreground"><Instagram className="w-4 h-4" /></a>
            <a href="https://x.com/TradersWorldApp" target="_blank" rel="noreferrer" aria-label="X (Twitter)" className="text-muted-foreground hover:text-foreground"><XIcon className="w-4 h-4" /></a>
            <a href="https://www.youtube.com/@womentradetoo" target="_blank" rel="noreferrer" aria-label="YouTube" className="text-muted-foreground hover:text-foreground"><Youtube className="w-4 h-4" /></a>
          </div>
        </div>
      </footer>

      <BetaKeyModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </div>
  );
};

export default Landing;
