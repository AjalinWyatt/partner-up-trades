import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, CheckCircle, TrendingUp, Users, Heart, ArrowRight, Instagram, Youtube } from "lucide-react";
import { toast } from "sonner";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

const ComingSoon = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState("Forex");
  const [navShadow, setNavShadow] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("waitlist" as any).insert({ email: email.trim(), market: selectedMarket } as any);
    setLoading(false);
    if (error) { toast.error("Something went wrong"); return; }
    setSubmitted(true);
    toast.success("You're on the list! We'll notify you when we launch.");
  };

  useEffect(() => {
    const handleScroll = () => setNavShadow(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const revealRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    revealRef.current = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("landing-visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".landing-reveal").forEach(el => revealRef.current?.observe(el));
    return () => revealRef.current?.disconnect();
  }, []);

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
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen bg-[#0D1410] relative flex items-center overflow-hidden pt-[68px]">
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full animate-[orb-pulse_6s_ease-in-out_infinite]" style={{ background: "radial-gradient(circle at 35% 40%, rgba(30,112,224,0.25) 0%, rgba(18,184,122,0.18) 40%, transparent 70%)" }} />
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
            <div className="inline-flex items-center gap-[7px] bg-white/[0.07] border border-white/[0.12] rounded-full px-3.5 py-1.5 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-pulse" />
              <span className="text-xs font-semibold text-white/70 tracking-wider">Coming Soon</span>
            </div>

            <h1 className="font-['Gabarito'] text-[clamp(44px,6vw,72px)] font-black text-white leading-[1.02] tracking-[-0.04em] mb-5">
              The Accountability<br />Platform for<br /><span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Serious Traders.</span>
            </h1>
            <p className="text-lg text-white/55 leading-relaxed mb-4 max-w-[480px] mx-auto lg:mx-0">
              Most traders don't fail because of strategy. They fall off because they're doing it alone.
            </p>
            <p className="text-base text-white/40 leading-relaxed mb-9 max-w-[480px] mx-auto lg:mx-0 italic">
              This journey isn't meant to be walked alone.
            </p>

            {/* Waitlist form */}
            {submitted ? (
              <div className="flex items-center gap-3 bg-[#12b87a]/10 border border-[#12b87a]/20 rounded-2xl px-6 py-5 max-w-[480px] mx-auto lg:mx-0 mb-10">
                <CheckCircle className="w-6 h-6 text-[#12b87a] shrink-0" />
                <div>
                  <p className="text-white font-bold font-['Gabarito'] text-lg">You're on the list ✓</p>
                  <p className="text-white/50 text-sm mt-0.5">We'll notify you when tradersworld launches.</p>
                </div>
              </div>
            ) : (
              <div className="max-w-[480px] mx-auto lg:mx-0 mb-10">
                {/* Market selector */}
                <div className="flex gap-2 mb-4">
                  {["Forex", "Futures", "Options"].map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedMarket(m)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all cursor-pointer ${
                        selectedMarket === m
                          ? "bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-white border-transparent"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder="your@email.com"
                    className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-5 py-3.5 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-[#12b87a]/50 transition-colors"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !email.trim()}
                    className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a] text-[15px] font-bold text-white border-none cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    {loading ? "..." : <>Join Waitlist <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
                <p className="text-xs text-white/30 mt-3">Free forever · No spam · Be the first to know</p>
              </div>
            )}
          </div>

          {/* Phone mockup */}
          <div className="relative hidden lg:flex justify-center items-center">
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

            <div className="w-[260px] h-[540px] bg-[#1A1F2A] rounded-[40px] border-[1.5px] border-white/10 overflow-hidden relative animate-[phone-float_5s_ease-in-out_infinite]" style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}>
              <div className="w-20 h-6 bg-[#0D1117] rounded-b-2xl absolute top-0 left-1/2 -translate-x-1/2 z-10" />
              <div className="w-full h-full bg-[#0D1117] p-[36px_14px_14px]">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="text-[11px] font-bold text-white font-['Gabarito']">Good morning, <span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">Trish</span></div>
                  <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#1e70e0] to-[#12b87a]" />
                </div>
                <div className="bg-[#f5a623]/[0.12] border border-[#f5a623]/20 rounded-[10px] p-2 flex items-center gap-[7px] mb-2.5">
                  <div className="w-[18px] h-[18px] rounded-full bg-[#f5a623]/20 flex items-center justify-center shrink-0">
                    <Heart className="w-[10px] h-[10px] text-[#f5a623]" />
                  </div>
                  <div className="text-[9px] text-white/70 leading-[1.4]"><strong className="text-[#f5a623]">Amara</strong> had a tough session. Check in?</div>
                </div>
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
                <div className="bg-white/5 rounded-xl p-[10px_11px] mb-2 border border-white/[0.06]">
                  <div className="text-[8px] font-bold tracking-wider uppercase mb-1.5 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">12-day streak</div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="flex-1 h-1 rounded-full bg-gradient-to-r from-[#1e70e0] to-[#12b87a]" />)}
                    <div className="flex-1 h-1 rounded-full bg-[#1e70e0]/40" />
                    <div className="flex-1 h-1 rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-[10px_11px] border border-white/[0.06]">
                  <div className="text-[8px] font-bold tracking-wider uppercase mb-1.5 bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">New matches</div>
                  <div className="flex mb-1.5">
                    {[["SK","from-[#0EA47A] to-[#1D4ED8]"],["JO","from-[#1D4ED8] to-[#7C3AED]"],["KM","from-[#7C3AED] to-[#DB2777]"]].map(([init, grad], i) => (
                      <div key={i} className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#1A1F2A] ${i > 0 ? "-ml-1.5" : ""}`}>{init}</div>
                    ))}
                    <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-dashed border-white/15 flex items-center justify-center text-[9px] text-white/40 -ml-1.5">+5</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0D1410] border-t border-white/[0.06] py-10">
        <div className="max-w-[1140px] mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <a href="#" className="font-['Gabarito'] text-lg font-black text-white tracking-[-0.04em] flex items-center gap-2 no-underline">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1e70e0] to-[#12b87a] flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            traders<span className="bg-gradient-to-r from-[#1e70e0] to-[#12b87a] bg-clip-text text-transparent">world</span>
          </a>
          <div className="flex items-center gap-5">
            <a href="https://instagram.com" target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-colors no-underline">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-colors no-underline">
              <XIcon className="w-4 h-4" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-colors no-underline">
              <Youtube className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-white/30">© {new Date().getFullYear()} tradersworld™ · All rights reserved</p>
        </div>
      </footer>
    </div>
  );
};

export default ComingSoon;
