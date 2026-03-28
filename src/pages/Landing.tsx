import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Shield, CheckCircle, XCircle, Zap, Users, User, Search, TrendingUp, MessageSquare, BarChart3, Calendar, Bell, Heart, ArrowRight, Instagram, Youtube, Star } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

/* ─── Waitlist Modal ─── */
const WaitlistModal = ({ open, onClose, market }: { open: boolean; onClose: () => void; market: string }) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("waitlist" as any).insert({ email: email.trim(), market } as any);
    setLoading(false);
    if (error) { toast.error("Something went wrong"); return; }
    setSubmitted(true);
  };

  useEffect(() => { if (!open) { setEmail(""); setSubmitted(false); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#141A18] border-white/10 text-white max-w-sm">
        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle className="w-10 h-10 text-[#12b87a] mx-auto mb-3" />
            <p className="text-lg font-bold font-[Gabarito]">You're on the list ✓</p>
            <p className="text-sm text-white/50 mt-2">We'll notify you when {market} launches.</p>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-lg font-bold font-[Gabarito] mb-1">Join the {market} waitlist</p>
            <p className="text-sm text-white/50 mb-5">Get notified when {market} matching goes live.</p>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#12b87a]/50 mb-3"
            />
            <button
              onClick={handleSubmit} disabled={loading || !email.trim()}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-white font-bold text-sm disabled:opacity-50"
            >
              {loading ? "..." : "Notify me"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ─── X/Twitter icon ─── */
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

const LIVE_MARKETS = ["Forex", "Futures", "Stocks"];
const COMING_SOON_MARKETS = ["Crypto", "Indices", "Options", "ETFs", "Commodities", "Bonds"];

const Landing = () => {
  const navigate = useNavigate();
  const [traderCount, setTraderCount] = useState<number | null>(null);
  const [partnershipCount, setPartnershipCount] = useState<number | null>(null);
  const [waitlistMarket, setWaitlistMarket] = useState<string | null>(null);
  const [navShadow, setNavShadow] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*", { count: "exact", head: true }).then(({ count }) => setTraderCount(count ?? 0));
    supabase.from("partner_connections").select("*", { count: "exact", head: true }).eq("status", "accepted").then(({ count }) => setPartnershipCount(count ?? 0));
  }, []);

  useEffect(() => {
    const handleScroll = () => setNavShadow(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection observer for reveal animations
  const revealRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    revealRef.current = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("landing-visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".landing-reveal").forEach(el => revealRef.current?.observe(el));
    return () => revealRef.current?.disconnect();
  }, []);

  const formatNum = (n: number | null) => n === null ? "…" : n.toLocaleString();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="font-['DM_Sans'] text-[#0D1410] bg-white overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0D1410] border-b border-white/[0.06] transition-all" style={{ boxShadow: navShadow ? "0 4px 24px rgba(0,0,0,0.3)" : "none" }}>
        <div className="max-w-[1140px] mx-auto px-8 h-[68px] flex items-center justify-between">
          <a href="#" className="font-['Gabarito'] text-xl font-black text-white tracking-[-0.04em] flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1e70e0] to-[#12b87a] flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            traders<span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">world</span>
          </a>
          <div className="hidden md:flex items-center gap-9">
            <button onClick={() => scrollTo("how")} className="text-sm font-medium text-[#6B7A72] hover:text-[#0D1410] transition-colors bg-transparent border-none cursor-pointer">How it works</button>
            <button onClick={() => scrollTo("features")} className="text-sm font-medium text-[#6B7A72] hover:text-[#0D1410] transition-colors bg-transparent border-none cursor-pointer">Features</button>
            <button onClick={() => scrollTo("reviews")} className="text-sm font-medium text-[#6B7A72] hover:text-[#0D1410] transition-colors bg-transparent border-none cursor-pointer">Community</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/signin")} className="px-5 py-2 rounded-full border border-[#DDE8E2] text-sm font-semibold text-[#2C3830] hover:border-[#12b87a] hover:text-[#12b87a] transition-all bg-transparent cursor-pointer">Log in</button>
            <button onClick={() => navigate("/signup")} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-sm font-bold text-white border-none cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all">Get started free</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen bg-[#0D1410] relative flex items-center overflow-hidden pt-[68px]">
        {/* Background effects */}
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full animate-[orb-pulse_6s_ease-in-out_infinite]" style={{ background: "radial-gradient(circle at 35% 40%, rgba(30,112,224,0.25) 0%, rgba(18,184,122,0.18) 40%, transparent 70%)" }} />
        {/* Globe SVG */}
        <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] animate-[orb-pulse_6s_ease-in-out_infinite] pointer-events-none" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="195" fill="none" stroke="rgba(18,184,122,0.18)" strokeWidth="1.5" />
          <ellipse cx="200" cy="200" rx="195" ry="30" fill="none" stroke="rgba(18,184,122,0.12)" strokeWidth="1" />
          <ellipse cx="200" cy="140" rx="160" ry="24" fill="none" stroke="rgba(18,184,122,0.12)" strokeWidth="1" />
          <ellipse cx="200" cy="260" rx="160" ry="24" fill="none" stroke="rgba(18,184,122,0.12)" strokeWidth="1" />
          <ellipse cx="200" cy="200" rx="30" ry="195" fill="none" stroke="rgba(18,184,122,0.12)" strokeWidth="1" />
          <ellipse cx="200" cy="200" rx="80" ry="195" fill="none" stroke="rgba(18,184,122,0.12)" strokeWidth="1" />
          <ellipse cx="200" cy="200" rx="130" ry="195" fill="none" stroke="rgba(18,184,122,0.12)" strokeWidth="1" />
          <circle cx="140" cy="150" r="3" fill="rgba(30,112,224,0.35)" />
          <circle cx="260" cy="180" r="2.5" fill="rgba(18,184,122,0.4)" />
          <circle cx="180" cy="250" r="2" fill="rgba(245,166,35,0.3)" />
          <circle cx="240" cy="130" r="2" fill="rgba(18,184,122,0.3)" />
          <circle cx="300" cy="220" r="1.5" fill="rgba(30,112,224,0.25)" />
        </svg>
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full animate-[float-l_8s_ease-in-out_infinite]" style={{ background: "radial-gradient(circle, rgba(30,112,224,0.18) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full animate-[float-r_10s_ease-in-out_infinite]" style={{ background: "radial-gradient(circle, rgba(18,184,122,0.15) 0%, transparent 70%)" }} />

        <div className="relative z-[2] max-w-[1140px] mx-auto px-8 py-[100px] grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-[7px] bg-white/[0.07] border border-white/[0.12] rounded-full px-3.5 py-1.5 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12b87a] animate-pulse" />
              <span className="text-xs font-semibold text-white/70 tracking-wider">Now in beta — be one of the first</span>
            </div>

            <h1 className="font-['Gabarito'] text-[clamp(44px,6vw,72px)] font-black text-white leading-[1.02] tracking-[-0.04em] mb-5">
              The Accountability<br />Platform for<br /><span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Serious Traders.</span>
            </h1>
            <p className="text-lg text-white/55 leading-relaxed mb-9 max-w-[480px] mx-auto lg:mx-0">
              One dedicated partner. One daily check-in. No Discord chaos, no dead group chats. Structured accountability that keeps you in the game.
            </p>
            <div className="flex gap-3 flex-wrap mb-[52px] justify-center lg:justify-start">
              <button onClick={() => navigate("/signup")} className="px-[30px] py-[15px] rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-[15px] font-bold text-white border-none cursor-pointer hover:opacity-90 hover:-translate-y-px transition-all inline-flex items-center gap-2">
                Find Your Partner <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-9 justify-center lg:justify-start">
              <div>
                <div className="font-['Gabarito'] text-[28px] font-black bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent leading-none">{formatNum(traderCount)}</div>
                <div className="text-xs text-white/40 mt-[3px] font-medium">Active traders</div>
              </div>
              <div>
                <div className="font-['Gabarito'] text-[28px] font-black bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent leading-none">{formatNum(partnershipCount)}</div>
                <div className="text-xs text-white/40 mt-[3px] font-medium">Partnerships</div>
              </div>
            </div>
          </div>

          {/* Phone mockup - hidden on mobile */}
          <div className="relative hidden lg:flex justify-center items-center">
            {/* Floating cards */}
            <div className="absolute left-[-80px] top-[30%] bg-white/5 backdrop-blur-xl border border-white/10 rounded-[14px] px-3.5 py-2.5 animate-[fc-float-l_6s_ease-in-out_infinite]">
              <div className="w-7 h-7 rounded-lg bg-[#12b87a]/15 flex items-center justify-center mb-1.5">
                <TrendingUp className="w-4 h-4 text-[#12b87a]" />
              </div>
              <div className="text-[10px] font-semibold text-white whitespace-nowrap">Session logged</div>
              <div className="text-[9px] text-white/40 whitespace-nowrap">+38 pips · Gold</div>
            </div>
            <div className="absolute right-[-80px] top-[55%] bg-white/5 backdrop-blur-xl border border-white/10 rounded-[14px] px-3.5 py-2.5 animate-[fc-float-r_7s_ease-in-out_infinite]">
              <div className="w-7 h-7 rounded-lg bg-[#1e70e0]/15 flex items-center justify-center mb-1.5">
                <Users className="w-4 h-4 text-[#1e70e0]" />
              </div>
              <div className="text-[10px] font-semibold text-white whitespace-nowrap">New match</div>
              <div className="text-[9px] text-white/40 whitespace-nowrap">94% compatible</div>
            </div>

            {/* Phone */}
            <div className="w-[260px] h-[540px] bg-[#1A1F2A] rounded-[40px] border-[1.5px] border-white/10 overflow-hidden relative animate-[phone-float_5s_ease-in-out_infinite]" style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}>
              <div className="w-20 h-6 bg-[#0D1117] rounded-b-2xl absolute top-0 left-1/2 -translate-x-1/2 z-10" />
              <div className="w-full h-full bg-[#0D1117] p-[36px_14px_14px]">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="text-[11px] font-bold text-white font-['Gabarito']">Good morning, <span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Trish</span></div>
                  <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#1e70e0] to-[#12b87a]" />
                </div>
                {/* Alert */}
                <div className="bg-[#f5a623]/[0.12] border border-[#f5a623]/20 rounded-[10px] p-2 flex items-center gap-[7px] mb-2.5">
                  <div className="w-[18px] h-[18px] rounded-full bg-[#f5a623]/20 flex items-center justify-center shrink-0">
                    <Heart className="w-[10px] h-[10px] text-[#f5a623]" />
                  </div>
                  <div className="text-[9px] text-white/70 leading-[1.4]"><strong className="text-[#f5a623]">Amara</strong> had a tough session. Check in?</div>
                </div>
                {/* Partner card */}
                <div className="bg-white/5 rounded-xl p-[10px_11px] mb-2 border border-white/[0.06]">
                  <div className="text-[8px] font-bold tracking-wider uppercase mb-1.5 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Your duo partner</div>
                  <div className="flex items-center gap-[7px]">
                    <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#0EA47A] flex items-center justify-center text-[9px] font-bold text-white">AL</div>
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold text-white">Amara L.</div>
                      <div className="text-[8px] text-white/40">Gold · London session</div>
                    </div>
                    <div className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#E45C2D]/15 text-[#E45C2D]">Tough</div>
                  </div>
                </div>
                {/* Streak */}
                <div className="bg-white/5 rounded-xl p-[10px_11px] mb-2 border border-white/[0.06]">
                  <div className="text-[8px] font-bold tracking-wider uppercase mb-1.5 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">12-day streak</div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="flex-1 h-1 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a]" />)}
                    <div className="flex-1 h-1 rounded-full bg-[#1e70e0]/40" />
                    <div className="flex-1 h-1 rounded-full bg-white/10" />
                  </div>
                </div>
                {/* Matches */}
                <div className="bg-white/5 rounded-xl p-[10px_11px] border border-white/[0.06]">
                  <div className="text-[8px] font-bold tracking-wider uppercase mb-1.5 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">New matches</div>
                  <div className="flex mb-1.5">
                    {[["SK","from-[#0EA47A] to-[#1D4ED8]"],["JO","from-[#1D4ED8] to-[#7C3AED]"],["KM","from-[#7C3AED] to-[#DB2777]"]].map(([init, grad], i) => (
                      <div key={i} className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#1A1F2A] ${i > 0 ? "-ml-1.5" : ""}`}>{init}</div>
                    ))}
                    <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-dashed border-white/15 flex items-center justify-center text-[9px] text-white/40 -ml-1.5">+5</div>
                  </div>
                  <div className="text-[9px] text-white/50">8 compatible traders waiting</div>
                  <button className="w-full py-1.5 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] border-none rounded-full text-[9px] font-bold text-white mt-1.5 cursor-pointer">View matches</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div className="bg-[#F3F7F4] border-t border-b border-[#DDE8E2] py-5">
        <div className="max-w-[1140px] mx-auto px-8 flex items-center justify-center gap-12 flex-wrap">
          {[
            [Globe, "Global community"],
            [Shield, "Vetted members"],
            [XCircle, "No gurus. No signals."],
            [Zap, "Free to start"],
          ].map(([Icon, text], i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#DDE8E2] flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#2C3830]" />
              </div>
              <span className="text-[13px] font-semibold text-[#2C3830]">{text as string}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MARKETS ── */}
      <section className="py-[100px] bg-white" id="markets">
        <div className="max-w-[1140px] mx-auto px-8">
          <div className="text-center mb-16 landing-reveal">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Every market. Every style. Every level.</div>
            <h2 className="font-['Gabarito'] text-[clamp(32px,4vw,52px)] font-black text-[#0D1410] tracking-[-0.03em] leading-[1.08] mb-4">Matched to <span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">you.</span></h2>
            <p className="text-[17px] text-[#6B7A72] leading-relaxed max-w-[520px] mx-auto">Whatever you trade, we match you with partners who trade the same markets, the same sessions, and the same strategy.</p>
          </div>
          <div className="grid grid-cols-3 max-md:grid-cols-2 gap-[2px] bg-[#DDE8E2] rounded-[20px] overflow-hidden mb-7 landing-reveal">
            {LIVE_MARKETS.map(m => (
              <div key={m} className="bg-white p-6 flex items-center justify-between hover:bg-[#F3F7F4] transition-colors cursor-pointer">
                <span className="font-['Gabarito'] text-base font-extrabold text-[#0D1410]">{m}</span>
                <ArrowRight className="w-5 h-5 text-[#6B7A72]" />
              </div>
            ))}
            {COMING_SOON_MARKETS.map(m => (
              <div key={m} className="bg-white p-6 flex items-center justify-between opacity-50 cursor-default relative">
                <span className="font-['Gabarito'] text-base font-extrabold text-[#0D1410]/50">{m}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-[#F5A623] to-[#E8843A] text-white">Coming Soon</span>
                  <button onClick={() => setWaitlistMarket(m)} className="text-[10px] font-semibold text-[#1e70e0] hover:underline bg-transparent border-none cursor-pointer">Join waitlist</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#6B7A72] landing-reveal">You tell us what you trade. <strong className="text-[#0D1410]">We match you with people who trade the same thing.</strong></p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-[100px] bg-white" id="how">
        <div className="max-w-[1140px] mx-auto px-8">
          <div className="text-center mb-16 landing-reveal">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">How it works</div>
            <h2 className="font-['Gabarito'] text-[clamp(32px,4vw,52px)] font-black text-[#0D1410] tracking-[-0.03em] leading-[1.08] mb-4">From signup to<br />accountability in minutes.</h2>
            <p className="text-[17px] text-[#6B7A72] leading-relaxed max-w-[520px] mx-auto">Four steps to your dedicated trading accountability partner.</p>
          </div>
          <div className="grid grid-cols-4 max-md:grid-cols-2 gap-[2px] bg-[#DDE8E2] rounded-3xl overflow-hidden landing-reveal">
            {[
              { icon: User, title: "Build your profile", text: "Markets, strategy, experience level, trading schedule, and what you need to fix. The algorithm needs the truth." },
              { icon: Search, title: "Get matched", text: "Paired with traders who complement your goals, trade the same sessions, and hold the same standards." },
              { icon: Users, title: "Connect & commit", text: "Set accountability goals together. Daily check-ins, session reviews, and real consequences for going off-plan." },
              { icon: TrendingUp, title: "Grow together", text: "Log every session. Track your edge. Your partner sees your progress — and your slips. That's the point." },
            ].map((step, i) => (
              <div key={i} className="bg-white p-9 max-md:p-7 relative">
                <div className="font-['Gabarito'] text-5xl font-black leading-none mb-4 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">0{i + 1}</div>
                <div className="w-10 h-10 rounded-[10px] bg-[#F3F7F4] border border-[#DDE8E2] flex items-center justify-center mb-3.5">
                  <step.icon className="w-5 h-5 text-[#2C3830]" />
                </div>
                <div className="font-['Gabarito'] text-lg font-extrabold text-[#0D1410] mb-2">{step.title}</div>
                <div className="text-sm text-[#6B7A72] leading-relaxed">{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-[100px] bg-[#0D1410]" id="features">
        <div className="max-w-[1140px] mx-auto px-8">
          <div className="text-center mb-16 landing-reveal">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 text-white/50">Everything you need</div>
            <h2 className="font-['Gabarito'] text-[clamp(32px,4vw,52px)] font-black text-white tracking-[-0.03em] leading-[1.08] mb-4">Built for traders who<br />take this <span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">seriously.</span></h2>
            <p className="text-[17px] text-white/50 leading-relaxed max-w-[520px] mx-auto">Everything the industry was missing. A platform that actually belongs to traders.</p>
          </div>
          <div className="grid grid-cols-3 max-md:grid-cols-2 gap-[2px] bg-white/[0.06] rounded-3xl overflow-hidden landing-reveal">
            {[
              { icon: Users, title: "Accountability Partners", text: "One dedicated partner who checks in daily, reviews your sessions, and holds you to your plan. No excuses." },
              { icon: MessageSquare, title: "Direct Messaging", text: "Private conversations with your partner. Share charts, review sessions, and stay connected in real time." },
              { icon: Heart, title: "Social Feed", text: "Share your sessions with partners. See their progress. Like, comment, and hold each other accountable." },
              { icon: BarChart3, title: "Daily Trading Log", text: "Smart notifications at the end of your trading window. Log your session in seconds. Your partner sees everything." },
              { icon: Calendar, title: "Streak Tracking", text: "Build consistency with daily logging streaks. Milestones, warnings, and accountability built right in." },
              { icon: Bell, title: "Smart Notifications", text: "Partner alerts, session reminders, streak warnings, and match updates. Stay informed without the noise." },
            ].map((f, i) => (
              <div key={i} className="bg-[#141A18] p-9 max-md:p-7 hover:bg-[#1A2220] transition-colors">
                <div className="w-12 h-12 rounded-[14px] bg-white/[0.06] flex items-center justify-center mb-[18px]">
                  <f.icon className="w-[22px] h-[22px] text-[#12b87a]" />
                </div>
                <div className="font-['Gabarito'] text-lg font-extrabold text-white mb-2">{f.title}</div>
                <div className="text-sm text-white/45 leading-relaxed">{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRADING LOG SECTION ── */}
      <section className="py-[100px] bg-[#F3F7F4]">
        <div className="max-w-[1140px] mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative landing-reveal hidden lg:block">
              {/* Floating notification */}
              <div className="absolute right-[-20px] top-5 bg-white rounded-[14px] p-[10px_14px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] w-[180px] border border-[#DDE8E2] animate-[notif-bounce_3s_ease-in-out_infinite]">
                <div className="flex items-center gap-[7px] mb-1">
                  <div className="w-[22px] h-[22px] rounded-[7px] bg-gradient-to-r from-[#1e70e0] to-[#12b87a] flex items-center justify-center">
                    <Globe className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-[#6B7A72]">Traders World</span>
                </div>
                <div className="text-[11px] font-bold text-[#0D1410] mb-0.5">How was your session?</div>
                <div className="text-[10px] text-[#6B7A72] leading-[1.4]">London window just closed. Log it for Amara.</div>
              </div>
              {/* Phone */}
              <div className="w-[240px] h-[420px] bg-[#0D1410] rounded-[34px] border-[1.5px] border-white/10 overflow-hidden mx-auto shadow-[0_30px_80px_rgba(0,0,0,0.2)]">
                <div className="p-[28px_16px_16px]">
                  {/* Notification card */}
                  <div className="bg-white/[0.07] rounded-[14px] p-3.5 mb-3.5 border border-white/[0.08]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-r from-[#1e70e0] to-[#12b87a] flex items-center justify-center"><Globe className="w-[11px] h-[11px] text-white" /></div>
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Traders World</span>
                    </div>
                    <div className="text-xs font-bold text-white mb-[3px]">Session ended — how did it go?</div>
                    <div className="text-[10px] text-white/40 leading-[1.4]">Log your session. Your partner will see it instantly.</div>
                    <div className="flex gap-1.5 mt-2.5">
                      <button className="flex-1 py-[7px] rounded-full text-[10px] font-bold bg-white/[0.08] text-white/50 border-none">Later</button>
                      <button className="flex-1 py-[7px] rounded-full text-[10px] font-bold bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-white border-none">Log now</button>
                    </div>
                  </div>
                  {/* Log entries */}
                  <div className="bg-white/5 border border-white/[0.08] rounded-[10px] p-[9px_10px] mb-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#12b87a]" /><span className="text-[9px] font-bold text-white/60">Great session</span></div>
                      <span className="font-['Gabarito'] text-[10px] font-extrabold text-[#12b87a]">+38 pips</span>
                    </div>
                    <div className="flex gap-[3px] flex-wrap">
                      <span className="text-[7px] font-semibold px-[5px] py-[2px] rounded-[3px] bg-[#12b87a]/[0.12] text-[#12b87a]">Followed plan</span>
                      <span className="text-[7px] font-semibold px-[5px] py-[2px] rounded-[3px] bg-[#12b87a]/[0.12] text-[#12b87a]">Clean entry</span>
                      <span className="text-[7px] font-semibold px-[5px] py-[2px] rounded-[3px] bg-white/[0.08] text-white/40">Gold · London</span>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/[0.08] rounded-[10px] p-[9px_10px] mb-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#E45C2D]" /><span className="text-[9px] font-bold text-white/60">Tough day</span></div>
                      <span className="font-['Gabarito'] text-[10px] font-extrabold text-[#E45C2D]">-22 pips</span>
                    </div>
                    <div className="flex gap-[3px] flex-wrap">
                      <span className="text-[7px] font-semibold px-[5px] py-[2px] rounded-[3px] bg-[#E45C2D]/[0.12] text-[#E45C2D]">FOMO entry</span>
                      <span className="text-[7px] font-semibold px-[5px] py-[2px] rounded-[3px] bg-[#E45C2D]/[0.12] text-[#E45C2D]">Moved stop</span>
                      <span className="text-[7px] font-semibold px-[5px] py-[2px] rounded-[3px] bg-white/[0.08] text-white/40">Gold · London</span>
                    </div>
                  </div>
                  <div className="bg-[#12b87a]/[0.08] border border-[#12b87a]/20 rounded-xl p-[10px_12px]">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-[#12b87a] mb-1">Shared with Amara</div>
                    <div className="text-[10px] text-white/60 leading-[1.4]">Your partner can see your P&L, what you did right, what went wrong, and how you felt.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="landing-reveal">
              <div className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Session logging & accountability</div>
              <h2 className="font-['Gabarito'] text-[clamp(32px,4vw,52px)] font-black text-[#0D1410] tracking-[-0.03em] leading-[1.08] mb-4">Log it. Share it.<br />Hold each other accountable.</h2>
              <p className="text-base text-[#6B7A72] leading-[1.7] mb-5">After every trading session, we send you a push notification. Log how it went — your P&L, what you did right, what you did wrong, and how you're feeling. It takes seconds.</p>
              <p className="text-base text-[#6B7A72] leading-[1.7] mb-7">Your log is instantly shared with your accountability partner. They see everything — and you see theirs. That's how real accountability works.</p>
              <div className="flex flex-col gap-3">
                {[
                  [Bell, "Push notification after your session window closes — never forget to log"],
                  [BarChart3, "Log your P&L, mood, what went right, what went wrong — with color-coded tags"],
                  [Users, "Shared instantly with your partner — view theirs, check in, stay accountable"],
                  [TrendingUp, "Track your own log over time — spot patterns, measure your edge, see growth"],
                ].map(([Icon, text], i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[#F3F7F4] border border-[#DDE8E2] flex items-center justify-center shrink-0">
                      <Icon className="w-[18px] h-[18px] text-[#2C3830]" />
                    </div>
                    <span className="text-sm text-[#2C3830]">{text as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-[100px] bg-[#F3F7F4]" id="reviews">
        <div className="max-w-[1140px] mx-auto px-8">
          <div className="text-center mb-[52px] landing-reveal">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Trader testimonials</div>
            <h2 className="font-['Gabarito'] text-[clamp(32px,4vw,52px)] font-black text-[#0D1410] tracking-[-0.03em] leading-[1.08] mb-4">They found their people.</h2>
            <p className="text-[17px] text-[#6B7A72] leading-relaxed max-w-[520px] mx-auto">From accountability breakthroughs to funded accounts — this is what happens when traders stop going it alone.</p>
          </div>
          <div className="grid grid-cols-3 max-md:grid-cols-1 gap-5">
            {[
              { text: "I went from blowing accounts every 3 months to passing my first prop challenge. My accountability partner kept me from revenge trading every single day.", name: "Kezia M.", meta: "Gold trader · London", init: "KM", grad: "from-[#0EA47A] to-[#1D4ED8]" },
              { text: "Finally found a trader who actually trades the same session as me. We do weekly reviews and it's changed everything about how I prepare.", name: "Marcus K.", meta: "Forex trader · Lagos", init: "MK", grad: "from-[#1D4ED8] to-[#7C3AED]" },
              { text: "The daily logging changed my game. My partner calls me out when I skip a session or go off-plan. I needed that more than any course.", name: "Sofia R.", meta: "Indices trader · Dubai", init: "SR", grad: "from-[#7C3AED] to-[#DB2777]" },
            ].map((r, i) => (
              <div key={i} className="bg-white rounded-[20px] p-7 border border-[#DDE8E2] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-all landing-reveal">
                <div className="flex gap-0.5 text-[#F5A623] mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-[#F5A623]" />)}
                </div>
                <p className="text-[15px] text-[#2C3830] leading-relaxed mb-[18px] italic">"{r.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${r.grad} flex items-center justify-center text-xs font-bold text-white font-['Gabarito']`}>{r.init}</div>
                  <div>
                    <div className="text-[13px] font-bold text-[#0D1410]">{r.name}</div>
                    <div className="text-[11px] text-[#6B7A72]">{r.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-[100px] bg-white">
        <div className="max-w-[800px] mx-auto px-8 text-center landing-reveal">
          <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center animate-[globe-spin_10s_linear_infinite]">
            <Globe className="w-16 h-16 text-[#0D1410]" strokeWidth={1.2} />
          </div>
          <h2 className="font-['Gabarito'] text-[clamp(36px,5vw,64px)] font-black text-[#0D1410] tracking-[-0.04em] mb-3.5 leading-[1.05]">Trading doesn't have<br />to be <span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">done alone.</span></h2>
          <p className="text-[17px] text-[#6B7A72] leading-relaxed mb-9">Join traders who found their accountability partner. Your people are already here.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate("/signup")} className="px-9 py-[17px] rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-base font-bold text-white border-none cursor-pointer hover:opacity-90 hover:-translate-y-0.5 transition-all inline-flex items-center gap-2">
              Get matched <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#6B7A72] mt-4">Free for traders. No credit card required.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0D1410] pt-[52px] pb-8">
        <div className="max-w-[1140px] mx-auto px-8">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] max-md:grid-cols-2 gap-12 mb-12">
            <div>
              <div className="font-['Gabarito'] text-xl font-black text-white tracking-[-0.04em] mb-2.5 flex items-center gap-2">
                traders<span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">world</span>
              </div>
              <p className="text-[13px] text-white/35 leading-relaxed">The accountability platform for serious traders. Find your partner and build the consistency your trading demands.</p>
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3.5">Product</div>
              <button onClick={() => scrollTo("how")} className="block text-[13px] text-white/40 mb-2 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-left">How it works</button>
              <button onClick={() => scrollTo("features")} className="block text-[13px] text-white/40 mb-2 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-left">Features</button>
              <button onClick={() => scrollTo("markets")} className="block text-[13px] text-white/40 mb-2 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-left">Markets</button>
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3.5">Community</div>
              <button onClick={() => scrollTo("reviews")} className="block text-[13px] text-white/40 mb-2 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-left">Testimonials</button>
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3.5">Company</div>
              <a href="#" className="block text-[13px] text-white/40 no-underline mb-2 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="block text-[13px] text-white/40 no-underline mb-2 hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="block text-[13px] text-white/40 no-underline mb-2 hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex items-center justify-between">
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

      <WaitlistModal open={!!waitlistMarket} onClose={() => setWaitlistMarket(null)} market={waitlistMarket || ""} />

      {/* CSS Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gabarito:wght@400;500;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        @keyframes orb-pulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.8} 50%{transform:translate(-50%,-50%) scale(1.08);opacity:1} }
        @keyframes float-l { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-30px)} }
        @keyframes float-r { 0%,100%{transform:translateY(0)} 50%{transform:translateY(20px)} }
        @keyframes phone-float { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-12px) rotate(-1deg)} }
        @keyframes fc-float-l { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fc-float-r { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
        @keyframes notif-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes globe-spin { 0%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} 100%{transform:rotate(-3deg)} }
        .landing-reveal { opacity:0; transform:translateY(28px); transition:opacity 0.6s ease, transform 0.6s ease; }
        .landing-visible { opacity:1; transform:translateY(0); }
      `}</style>
    </div>
  );
};

export default Landing;
