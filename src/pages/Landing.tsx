import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe, Shield, CheckCircle, Zap, Users, User, TrendingUp,
  MessageSquare, BarChart3, Bell, Heart, ArrowRight, Instagram, Youtube,
  Star, KeyRound, Lock, Sparkles, Calendar, Search,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Wordmark from "@/components/Wordmark";

/* ───────────────── Constants ───────────────── */
const MARKETS = [
  "Forex", "Futures", "Options", "Stocks", "Crypto", "Indices", "Commodities",
];

/* ───────────────── X icon ───────────────── */
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

/* ───────────────── Beta-key modal ───────────────── */
const BetaKeyModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!open) setKey(""); }, [open]);

  const submit = async () => {
    if (!key.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-beta-key", {
        body: { key: key.trim() },
      });
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
      <DialogContent className="bg-[#141A18] border-white/10 text-white max-w-sm">
        <DialogTitle className="sr-only">Enter beta access key</DialogTitle>
        <div className="py-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e70e0] to-[#12b87a] flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <p className="text-lg font-bold font-[Gabarito] mb-1">Enter your beta key</p>
          <p className="text-sm text-white/50 mb-5">Beta testers were sent a private access key. Paste it below to unlock sign-up.</p>
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="xxxx-xxxx-xxxx"
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#12b87a]/50 mb-3 font-mono tracking-wider"
          />
          <button
            onClick={submit}
            disabled={loading || !key.trim()}
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-white font-bold text-sm disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Unlock sign-up"}
          </button>
          <p className="text-[11px] text-white/35 text-center mt-3">No key? Join the waitlist below to get notified at launch.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ───────────────── Waitlist form (hero) ───────────────── */
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
      market: markets[0], // legacy column
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
    <form onSubmit={submit} className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">Email *</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com" required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#12b87a]/60 transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">Phone *</label>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+1 555 000 0000" required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#12b87a]/60 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">Markets you trade *</label>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map(m => {
            const active = markets.includes(m);
            return (
              <button
                type="button" key={m} onClick={() => toggleMarket(m)}
                className={`px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-white border-transparent"
                    : "bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] px-4 py-3 transition-colors">
        <input
          type="checkbox" checked={wantsBeta} onChange={e => setWantsBeta(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-[#12b87a]"
        />
        <span className="flex-1">
          <span className="block text-[13px] font-bold text-white">I want to be a beta tester</span>
          <span className="block text-[11px] text-white/50 mt-0.5">Get early access before public launch + help shape the platform.</span>
        </span>
        <Sparkles className="w-4 h-4 text-[#12b87a]" />
      </label>

      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-white font-bold text-sm disabled:opacity-50 hover:opacity-95 active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2"
      >
        {loading ? "Joining…" : <>Join the waitlist <ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-[11px] text-white/35 text-center">We'll only use your contact info to notify you about launch.</p>
    </form>
  );
};

/* ───────────────── Page ───────────────── */
const Landing = () => {
  const navigate = useNavigate();
  const [navShadow, setNavShadow] = useState(false);
  const [betaOpen, setBetaOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // If user is already logged in, send them into the app
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

  // Reveal-on-scroll
  const revealRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    revealRef.current = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("landing-visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".landing-reveal").forEach(el => revealRef.current?.observe(el));
    return () => revealRef.current?.disconnect();
  }, [submitted]);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="font-['DM_Sans'] text-white bg-[#0A0F0D] overflow-x-hidden min-h-screen">
      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-[100] bg-[#0A0F0D]/85 backdrop-blur-xl border-b border-white/[0.06] transition-all"
        style={{ boxShadow: navShadow ? "0 4px 24px rgba(0,0,0,0.45)" : "none" }}
      >
        <div className="max-w-[1180px] mx-auto px-6 sm:px-8 h-[68px] flex items-center justify-between">
          <a href="#" className="flex items-center no-underline"><Wordmark size="text-lg" /></a>
          <div className="hidden md:flex items-center gap-9">
            <button onClick={() => scrollTo("preview")} className="text-sm font-medium text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer">Inside the app</button>
            <button onClick={() => scrollTo("features")} className="text-sm font-medium text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer">Features</button>
            <button onClick={() => scrollTo("waitlist")} className="text-sm font-medium text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer">Waitlist</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBetaOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/15 text-[13px] font-semibold text-white/80 hover:border-[#12b87a] hover:text-[#12b87a] transition-all bg-transparent cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" /> Beta key
            </button>
            <button
              onClick={() => scrollTo("waitlist")}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-[13px] sm:text-sm font-bold text-white border-none cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Join waitlist
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-[68px]">
        {/* Background grid + glow */}
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] rounded-full animate-[orb-pulse_7s_ease-in-out_infinite]" style={{
          background: "radial-gradient(circle at 35% 40%, rgba(30,112,224,0.18) 0%, rgba(18,184,122,0.12) 45%, transparent 70%)",
        }} />
        <div className="absolute top-[10%] left-[-15%] w-[520px] h-[520px] rounded-full animate-[float-l_9s_ease-in-out_infinite]" style={{
          background: "radial-gradient(circle, rgba(30,112,224,0.18) 0%, transparent 70%)",
        }} />
        <div className="absolute bottom-[5%] right-[-10%] w-[460px] h-[460px] rounded-full animate-[float-r_11s_ease-in-out_infinite]" style={{
          background: "radial-gradient(circle, rgba(18,184,122,0.16) 0%, transparent 70%)",
        }} />

        <div className="relative z-[2] max-w-[1180px] mx-auto px-6 sm:px-8 py-[80px] grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-14 items-center w-full">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-[7px] bg-white/[0.07] border border-white/[0.12] rounded-full px-3.5 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12b87a] animate-pulse" />
              <span className="text-[11px] font-semibold text-white/70 tracking-wider uppercase">Private beta · Launching soon</span>
            </div>

            <h1 className="font-['Gabarito'] text-[clamp(40px,6vw,68px)] font-black leading-[1.02] tracking-[-0.04em] mb-5">
              The Accountability<br />Platform for<br />
              <span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Serious Traders.</span>
            </h1>
            <p className="text-lg text-white/55 leading-relaxed mb-3 max-w-[520px] mx-auto lg:mx-0">
              Most traders don't fail because of strategy. They fall off because they're doing it alone.
            </p>
            <p className="text-base text-white/40 leading-relaxed mb-8 max-w-[520px] mx-auto lg:mx-0 italic">
              This journey isn't meant to be walked alone.
            </p>

            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start mb-10">
              <button
                onClick={() => scrollTo("waitlist")}
                className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-[15px] font-bold text-white border-none cursor-pointer hover:opacity-90 hover:-translate-y-px transition-all inline-flex items-center gap-2"
              >
                Get early access <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setBetaOpen(true)}
                className="px-6 py-3.5 rounded-full border border-white/20 text-[14px] font-semibold text-white/85 hover:border-[#12b87a] hover:text-[#12b87a] transition-all bg-transparent cursor-pointer inline-flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" /> I have a beta key
              </button>
            </div>

            <div className="flex gap-8 justify-center lg:justify-start">
              {[
                [Shield, "Vetted members"],
                [Globe, "Global community"],
                [Zap, "Free at launch"],
              ].map(([Icon, t], i) => (
                <div key={i} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#12b87a]" />
                  <span className="text-[12px] font-medium text-white/55">{t as string}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero waitlist card */}
          <div id="waitlist-hero" className="w-full max-w-[460px] mx-auto">
            {submitted ? (
              <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-3xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e70e0] to-[#12b87a] mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <p className="font-['Gabarito'] text-2xl font-black mb-2">You're on the list ✓</p>
                <p className="text-sm text-white/55">We'll email you the moment we open the doors. Watch your inbox.</p>
              </div>
            ) : (
              <WaitlistForm onSuccess={() => setSubmitted(true)} />
            )}
          </div>
        </div>
      </section>

      {/* ─── INSIDE THE APP (mock screenshots from real components) ─── */}
      <section id="preview" className="py-[100px] bg-[#0F1513] border-t border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 sm:px-8">
          <div className="text-center mb-14 landing-reveal">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">A look inside</div>
            <h2 className="font-['Gabarito'] text-[clamp(32px,4vw,52px)] font-black tracking-[-0.03em] leading-[1.08] mb-4">
              The whole platform — in <span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">one place.</span>
            </h2>
            <p className="text-[16px] text-white/50 leading-relaxed max-w-[560px] mx-auto">
              Find your trading partner, log every session, share your wins and losses, and stay accountable — all in one app.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 landing-reveal">
            {/* Mock 1 — Match card */}
            <MockCard label="Discover · Matching">
              <div className="bg-[#0A0F0D] rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0EA47A] to-[#1D4ED8] flex items-center justify-center text-white font-bold">AL</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-white">Amara L.</div>
                    <div className="text-[11px] text-white/45">Gold · London session</div>
                  </div>
                  <span className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-[#12b87a]/15 text-[#12b87a]">94%</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {["Same market", "Same session", "Same goal"].map(t => (
                    <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">{t}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-white/60">Pass</button>
                  <button className="flex-1 py-2 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-[11px] font-bold text-white">Connect</button>
                </div>
              </div>
            </MockCard>

            {/* Mock 2 — Trading log */}
            <MockCard label="Trading Log">
              <div className="bg-[#0A0F0D] rounded-2xl p-4 border border-white/10 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#12b87a]" />
                    <span className="text-[10px] font-bold text-white/60">Great session</span>
                  </div>
                  <span className="font-['Gabarito'] text-[12px] font-extrabold text-[#12b87a]">+38 pips</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["Followed plan", "Clean entry", "Gold · London"].map((t, i) => (
                    <span key={i} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                      i < 2 ? "bg-[#12b87a]/15 text-[#12b87a]" : "bg-white/5 text-white/40"
                    }`}>{t}</span>
                  ))}
                </div>
                <div className="border-t border-white/5 pt-2 mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E45C2D]" />
                      <span className="text-[10px] font-bold text-white/60">Tough day</span>
                    </div>
                    <span className="font-['Gabarito'] text-[12px] font-extrabold text-[#E45C2D]">-22 pips</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {["FOMO entry", "Moved stop"].map(t => (
                      <span key={t} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#E45C2D]/15 text-[#E45C2D]">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </MockCard>

            {/* Mock 3 — Pulse */}
            <MockCard label="Pulse · Live trader chat">
              <div className="bg-[#0A0F0D] rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#12b87a] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#12b87a]">Pulse active · 12:43</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-start">
                    <div className="bg-white/5 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
                      <div className="text-[11px] text-white/80">Saw the fakeout at 2680, glad I waited.</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%]">
                      <div className="text-[11px] text-white">Same. Voice note coming 🎙️</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-[#1e70e0]/80 to-[#12b87a]/80 rounded-full px-3 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] text-white font-semibold">0:14 voice note</span>
                    </div>
                  </div>
                </div>
              </div>
            </MockCard>

            {/* Mock 4 — Feed post */}
            <MockCard label="Social Feed">
              <div className="bg-[#0A0F0D] rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#7C3AED] flex items-center justify-center text-[10px] font-bold text-white">MK</div>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-white">Marcus K.</div>
                    <div className="text-[9px] text-white/40">Forex · 2h</div>
                  </div>
                </div>
                <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-[#12b87a]/20 via-[#1e70e0]/15 to-[#7C3AED]/15 border border-white/5 mb-2 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-white/30" />
                </div>
                <div className="flex items-center gap-3 text-white/50">
                  <Heart className="w-3.5 h-3.5" /> <span className="text-[10px]">42</span>
                  <MessageSquare className="w-3.5 h-3.5" /> <span className="text-[10px]">8</span>
                </div>
              </div>
            </MockCard>

            {/* Mock 5 — Notification */}
            <MockCard label="Smart Notifications">
              <div className="bg-[#0A0F0D] rounded-2xl p-3 border border-white/10 space-y-2">
                <div className="flex items-start gap-2 p-2 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20">
                  <Heart className="w-4 h-4 text-[#f5a623] mt-0.5" />
                  <div className="text-[10px] text-white/75 leading-snug"><b className="text-[#f5a623]">Amara</b> had a tough session. Check in?</div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-[#12b87a]/10 border border-[#12b87a]/20">
                  <TrendingUp className="w-4 h-4 text-[#12b87a] mt-0.5" />
                  <div className="text-[10px] text-white/75 leading-snug"><b className="text-[#12b87a]">Sofia</b> hit a 12-day streak 🔥</div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-[#1e70e0]/10 border border-[#1e70e0]/20">
                  <Users className="w-4 h-4 text-[#1e70e0] mt-0.5" />
                  <div className="text-[10px] text-white/75 leading-snug"><b className="text-[#1e70e0]">Kezia</b> sent a partner request.</div>
                </div>
              </div>
            </MockCard>

            {/* Mock 6 — Streak */}
            <MockCard label="Streaks & Stats">
              <div className="bg-[#0A0F0D] rounded-2xl p-4 border border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">12-day streak</div>
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5,6,7].map(i => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full ${
                      i <= 5 ? "bg-gradient-to-r from-[#1e70e0] to-[#12b87a]" : i === 6 ? "bg-[#1e70e0]/40" : "bg-white/10"
                    }`} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Sessions" value="48" />
                  <Stat label="Win rate" value="63%" />
                  <Stat label="Avg pips" value="+12" />
                </div>
              </div>
            </MockCard>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-[100px] bg-[#0A0F0D]">
        <div className="max-w-[1180px] mx-auto px-6 sm:px-8">
          <div className="text-center mb-14 landing-reveal">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 text-white/50">Everything you need</div>
            <h2 className="font-['Gabarito'] text-[clamp(32px,4vw,52px)] font-black tracking-[-0.03em] leading-[1.08] mb-4">
              Built for traders who<br />take this <span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">seriously.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[2px] bg-white/[0.06] rounded-3xl overflow-hidden landing-reveal">
            {[
              { icon: Users, title: "Accountability Partners", text: "Smart 100-point matching pairs you with a partner who trades the same markets, sessions, and goals." },
              { icon: MessageSquare, title: "Chat & Voice Notes", text: "Real-time DMs with voice notes, image attachments, and read receipts. Built for traders." },
              { icon: Zap, title: "Pulse Sessions", text: "Instant async trader connections — text + voice notes during live sessions. No phone calls." },
              { icon: BarChart3, title: "Trading Log", text: "Log every session — P&L, mood, what went right, what didn't. Color-coded performance tags." },
              { icon: Heart, title: "Social Feed", text: "Share your wins, losses, and chart screenshots. Stories, posts, comments — for traders only." },
              { icon: Bell, title: "Smart Notifications", text: "Partner alerts, session reminders, streak warnings, and inactivity check-ins." },
              { icon: Search, title: "Discover", text: "Browse compatible traders by market, style, session, and timezone. Save profiles for later." },
              { icon: Calendar, title: "Streak Tracking", text: "Daily logging streaks build the consistency your trading demands. Milestones built in." },
              { icon: Shield, title: "Privacy First", text: "Block, unmatch, control what's shared with partners vs public. You're in charge." },
            ].map((f, i) => (
              <div key={i} className="bg-[#0F1513] p-7 hover:bg-[#141A18] transition-colors">
                <div className="w-11 h-11 rounded-[12px] bg-white/[0.06] flex items-center justify-center mb-4">
                  <f.icon className="w-[20px] h-[20px] text-[#12b87a]" />
                </div>
                <div className="font-['Gabarito'] text-[16px] font-extrabold text-white mb-2">{f.title}</div>
                <div className="text-[13px] text-white/45 leading-relaxed">{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-[100px] bg-[#0F1513] border-t border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 sm:px-8">
          <div className="text-center mb-14 landing-reveal">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">How it works</div>
            <h2 className="font-['Gabarito'] text-[clamp(32px,4vw,52px)] font-black tracking-[-0.03em] leading-[1.08] mb-4">From signup to accountability in minutes.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px] bg-white/[0.06] rounded-3xl overflow-hidden landing-reveal">
            {[
              { icon: User, title: "Build your profile", text: "Markets, strategy, sessions, schedule, and what you need to fix." },
              { icon: Search, title: "Get matched", text: "Paired with traders who complement your goals and trade your sessions." },
              { icon: Users, title: "Connect & commit", text: "Daily check-ins, session reviews, real consequences for going off-plan." },
              { icon: TrendingUp, title: "Grow together", text: "Log every session. Your partner sees your progress — and your slips." },
            ].map((step, i) => (
              <div key={i} className="bg-[#0A0F0D] p-7">
                <div className="font-['Gabarito'] text-4xl font-black leading-none mb-3 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">0{i + 1}</div>
                <div className="w-10 h-10 rounded-[10px] bg-white/[0.06] flex items-center justify-center mb-3">
                  <step.icon className="w-5 h-5 text-white/70" />
                </div>
                <div className="font-['Gabarito'] text-[15px] font-extrabold text-white mb-1.5">{step.title}</div>
                <div className="text-[12px] text-white/50 leading-relaxed">{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WAITLIST CTA ─── */}
      <section id="waitlist" className="py-[100px] bg-[#0A0F0D] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full" style={{
          background: "radial-gradient(circle, rgba(18,184,122,0.12) 0%, transparent 65%)",
        }} />
        <div className="relative max-w-[640px] mx-auto px-6 sm:px-8 text-center landing-reveal">
          <div className="inline-flex items-center gap-1.5 bg-white/[0.07] border border-white/[0.12] rounded-full px-3.5 py-1.5 mb-5">
            <Lock className="w-3 h-3 text-white/60" />
            <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">Closed beta · Invite only</span>
          </div>
          <h2 className="font-['Gabarito'] text-[clamp(32px,5vw,56px)] font-black tracking-[-0.04em] mb-4 leading-[1.05]">
            Be first when we<br /><span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">open the doors.</span>
          </h2>
          <p className="text-[16px] text-white/50 leading-relaxed mb-8">
            Sign-up is locked while we're in private beta. Join the waitlist and we'll email you on launch day.
            Beta testers — <button onClick={() => setBetaOpen(true)} className="text-[#12b87a] font-semibold underline-offset-2 hover:underline bg-transparent border-none cursor-pointer p-0">enter your key</button>.
          </p>
          {submitted ? (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-3xl p-8">
              <CheckCircle className="w-10 h-10 text-[#12b87a] mx-auto mb-3" />
              <p className="font-['Gabarito'] text-xl font-black mb-1">You're on the list ✓</p>
              <p className="text-sm text-white/55">Watch your inbox for launch day.</p>
            </div>
          ) : (
            <WaitlistForm onSuccess={() => {
              setSubmitted(true);
              document.getElementById("waitlist-hero")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }} />
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#070A09] pt-12 pb-8 border-t border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2">
              <div className="mb-2.5"><Wordmark size="text-lg" /></div>
              <p className="text-[13px] text-white/35 leading-relaxed max-w-xs">
                The accountability platform for serious traders. Find your partner. Build the consistency your trading demands.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3.5">Product</div>
              <button onClick={() => scrollTo("preview")} className="block text-[13px] text-white/40 mb-2 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-left">Inside the app</button>
              <button onClick={() => scrollTo("features")} className="block text-[13px] text-white/40 mb-2 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-left">Features</button>
              <button onClick={() => scrollTo("waitlist")} className="block text-[13px] text-white/40 mb-2 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-left">Waitlist</button>
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3.5">Company</div>
              <a href="/privacy" className="block text-[13px] text-white/40 no-underline mb-2 hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="block text-[13px] text-white/40 no-underline mb-2 hover:text-white transition-colors">Terms</a>
              <a href="mailto:support@tradersworld.app" className="block text-[13px] text-white/40 no-underline mb-2 hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-white/[0.05] pt-6 flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-white/25">© 2026 Traders World. All rights reserved.</span>
            <div className="flex gap-3">
              {[Instagram, Youtube, XIcon].map((Icon, i) => (
                <a key={i} href="#" className="w-[34px] h-[34px] rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-white/50" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <BetaKeyModal open={betaOpen} onClose={() => setBetaOpen(false)} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gabarito:wght@400;500;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        @keyframes orb-pulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.85} 50%{transform:translate(-50%,-50%) scale(1.06);opacity:1} }
        @keyframes float-l { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-30px)} }
        @keyframes float-r { 0%,100%{transform:translateY(0)} 50%{transform:translateY(20px)} }
        .landing-reveal { opacity:0; transform:translateY(28px); transition:opacity 0.6s ease, transform 0.6s ease; }
        .landing-visible { opacity:1; transform:translateY(0); }
      `}</style>
    </div>
  );
};

/* ───────────────── Helpers ───────────────── */
const MockCard = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-3xl p-4 hover:border-white/15 hover:-translate-y-1 transition-all">
    <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3 px-1">{label}</div>
    {children}
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2 text-center">
    <div className="font-['Gabarito'] text-[14px] font-extrabold text-white">{value}</div>
    <div className="text-[9px] text-white/40 uppercase tracking-wide">{label}</div>
  </div>
);

export default Landing;