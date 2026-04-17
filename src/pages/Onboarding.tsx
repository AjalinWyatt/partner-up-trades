import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LogoHeader from "@/components/LogoHeader";
import AnimatedGlobe from "@/components/AnimatedGlobe";
import PillSelect from "@/components/onboarding/PillSelect";
import CardSelect from "@/components/onboarding/CardSelect";
import BigCardSelect from "@/components/onboarding/BigCardSelect";
import ReachSelect from "@/components/onboarding/ReachSelect";
import GenderSelect from "@/components/onboarding/GenderSelect";
import PromptCard from "@/components/onboarding/PromptCard";
import { Input } from "@/components/ui/input";

const TOTAL_STEPS = 7;

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [traderCount, setTraderCount] = useState(0);
  const [partnershipCount, setPartnershipCount] = useState(0);

  useEffect(() => {
    supabase.from("profiles").select("*", { count: "exact", head: true }).then(({ count }) => setTraderCount(count ?? 0));
    supabase.from("partner_connections").select("*", { count: "exact", head: true }).eq("status", "accepted").then(({ count }) => setPartnershipCount(count ?? 0));
  }, []);

  // Step 1
  const [nickname, setNickname] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [chartPrompts, setChartPrompts] = useState<string[]>([]);
  const [offChartPrompts, setOffChartPrompts] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Step 2
  const [markets, setMarkets] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [tradeTimes, setTradeTimes] = useState<string[]>([]);

  // Step 3
  const [styles, setStyles] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [timeframes, setTimeframes] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string[]>([]);

  // Step 4
  const [experience, setExperience] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [lossResponse, setLossResponse] = useState<string | null>(null);

  // Step 5
  const [struggles, setStruggles] = useState<string[]>([]);
  const [journaling, setJournaling] = useState<string[]>([]);
  const [tradingPlan, setTradingPlan] = useState<string[]>([]);

  // Step 6
  const [gender, setGender] = useState<string | null>(null);
  const [lookingFor, setLookingFor] = useState<string | null>(null);
  const [reach, setReach] = useState<string | null>(null);
  const [connectionTypes, setConnectionTypes] = useState<string[]>([]);
  const [connectFreq, setConnectFreq] = useState<string[]>([]);
  const [matchPriorities, setMatchPriorities] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  const toggle = useCallback((arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>) => {
    return (val: string) => {
      setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
    };
  }, []);

  const goTo = (n: number) => {
    setDirection(n > step ? 1 : -1);
    setStep(n);
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  const progressPct = step === 0 ? 0 : (step / TOTAL_STEPS) * 100;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex-1 flex flex-col items-center text-center px-7 pb-32 pt-10">
            <h1 className="text-[28px] font-black text-foreground tracking-tight">
              Traders<span className="font-black">World</span>
            </h1>
            <div className="flex-1 flex items-center justify-center w-full my-8">
              <div className="w-full max-w-[340px]">
                <AnimatedGlobe />
              </div>
            </div>
            <h2 className="text-[26px] font-bold text-foreground tracking-tight mb-3">
              Let's Meet People!
            </h2>
            <p className="text-[15px] italic font-semibold text-foreground mb-5">
              You're not trading alone!
            </p>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[320px]">
              Join a community focused on accountability, growth, and real results.
            </p>
          </div>
        );

      case 1:
        return (
          <div className="px-7 pb-32">
            <div className="text-[11px] font-semibold text-muted-foreground mb-4 tracking-wide">Step 1 of 7 · About you</div>

            {/* Avatar upload - centered */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                }
              }}
            />
            <div className="flex flex-col items-center mb-6">
              <div
                className="relative w-24 h-24 rounded-full border-2 border-dashed border-accent/60 flex items-center justify-center cursor-pointer hover:border-accent transition-colors overflow-hidden"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-accent-foreground text-sm font-bold leading-none">+</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Upload a picture (optional)</p>
            </div>

            {/* Username underline input */}
            <div className="text-sm font-bold text-foreground mb-3">What should we call you?</div>
            <div className="flex items-center gap-3 border-b border-border pb-2 mb-5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                placeholder="Username"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            {/* Date of birth underline input */}
            <div className="text-sm font-bold text-foreground mb-3">When were you born?</div>
            <div className="flex items-center gap-3 border-b border-border pb-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mb-5">You must be 18 or older to use Traders World.</p>

            <div className="text-sm font-bold text-foreground mb-3 mt-5">Pick a prompt for your profile</div>
            <PromptCard
              icon="📈"
              title="My Charts"
              question="When I look at a chart, I'm always watching for..."
              options={["Order blocks", "FVGs", "Key levels", "Fibonacci", "Support & resistance", "Liquidity zones", "Market structure", "BOS / CHOCH", "Moving averages", "VWAP", "Volume profile", "Supply & demand", "Imbalances", "EMA crosses", "RSI divergence", "Trendlines"]}
              selected={chartPrompts}
              onToggle={toggle(chartPrompts, setChartPrompts)}
            />
            <PromptCard
              icon="🌴"
              title="Off The Charts"
              question="When I'm not trading, I'm usually..."
              options={["Gym", "Football", "Basketball", "Music", "Travel", "Cars", "Gaming", "Family time", "Cooking", "Reading", "Content creation", "Fitness", "Golf", "Business", "Meditation"]}
              selected={offChartPrompts}
              onToggle={toggle(offChartPrompts, setOffChartPrompts)}
            />
          </div>
        );

      case 2:
        return (
          <div className="px-7 pb-32">
            <div className="text-[11px] font-semibold text-muted-foreground mb-4 tracking-wide">Step 2 of 7 · Your market</div>
            <h2 className="text-[28px] font-black text-foreground tracking-tight leading-tight mb-2">
              What's your<br /><span className="text-gradient-accent">trading world?</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Select all that apply — this is the foundation of your match.</p>

            <div className="text-sm font-bold text-foreground mb-3">What do you trade?</div>
            <PillSelect options={["Forex", "Futures", "Options"]} selected={markets} onToggle={toggle(markets, setMarkets)} />

            {markets.includes("Forex") && (
              <>
                <div className="text-sm font-bold text-foreground mb-3 mt-5">Forex instruments</div>
                <PillSelect options={["Major pairs", "Minor pairs", "Indices (NAS100, US30)", "Gold/XAU", "Exotics"]} selected={instruments} onToggle={toggle(instruments, setInstruments)} />
              </>
            )}
            {markets.includes("Futures") && (
              <>
                <div className="text-sm font-bold text-foreground mb-3 mt-5">Futures instruments</div>
                <PillSelect options={["Equity indices (NQ, ES, YM, RTY)", "Commodities (Oil, Gas, Wheat)", "Crypto futures (BTC, ETH)", "Metals"]} selected={instruments} onToggle={toggle(instruments, setInstruments)} />
              </>
            )}
            {markets.includes("Options") && (
              <>
                <div className="text-sm font-bold text-foreground mb-3 mt-5">Options instruments</div>
                <PillSelect options={["Stock options", "Index options (SPX, NDX)", "ETF options", "Futures options"]} selected={instruments} onToggle={toggle(instruments, setInstruments)} />
              </>
            )}

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">Which session do you mainly trade?</div>
            <PillSelect options={["London", "New York", "Asian", "Multiple / flexible"]} selected={sessions} onToggle={toggle(sessions, setSessions)} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">What time do you usually trade?</div>
            <PillSelect options={["Morning", "Afternoon", "Evening", "Night", "Varies"]} selected={tradeTimes} onToggle={toggle(tradeTimes, setTradeTimes)} />
          </div>
        );

      case 3:
        return (
          <div className="px-7 pb-32">
            <div className="text-[11px] font-semibold text-muted-foreground mb-4 tracking-wide">Step 3 of 7 · Your style</div>
            <h2 className="text-[28px] font-black text-foreground tracking-tight leading-tight mb-2">
              How do you<br /><span className="text-gradient-accent">actually trade?</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Your personality as a trader — helps us find people who think like you.</p>

            <div className="text-sm font-bold text-foreground mb-3">Trading style</div>
            <PillSelect options={["Scalper", "Day trader", "Swing trader", "Position trader"]} selected={styles} onToggle={toggle(styles, setStyles)} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">Strategy approach</div>
            <PillSelect options={["Price action", "Supply & demand", "Smart money / ICT", "Indicators", "Mixed"]} selected={strategies} onToggle={toggle(strategies, setStrategies)} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">Preferred timeframe</div>
            <PillSelect options={["1m – 5m", "15m – 1H", "4H – Daily", "Weekly – Monthly", "Mixed"]} selected={timeframes} onToggle={toggle(timeframes, setTimeframes)} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">How often do you trade?</div>
            <PillSelect options={["Daily", "Few times a week", "High quality setups only", "Inconsistent"]} selected={frequency} onToggle={toggle(frequency, setFrequency)} />
          </div>
        );

      case 4:
        return (
          <div className="px-7 pb-32">
            <div className="text-[11px] font-semibold text-muted-foreground mb-4 tracking-wide">Step 4 of 7 · Your journey</div>
            <h2 className="text-[28px] font-black text-foreground tracking-tight leading-tight mb-2">
              Where are you<br /><span className="text-gradient-accent">right now?</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Be honest — it helps us find the right people for where you're actually at.</p>

            <div className="text-sm font-bold text-foreground mb-3">Experience level</div>
            <CardSelect
              options={[
                { icon: "🟢", label: "Just getting started" },
                { icon: "🔵", label: "Building my edge" },
                { icon: "🟡", label: "Consistent & growing" },
                { icon: "⚡", label: "Profitable trader" },
              ]}
              selected={experience}
              onSelect={setExperience}
            />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">Current goal</div>
            <PillSelect options={["Learn the basics", "Get consistently profitable", "Pass a prop challenge", "Scale funded accounts", "Go full-time"]} selected={goals} onToggle={toggle(goals, setGoals)} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">When a trade goes wrong, you...</div>
            <CardSelect
              options={[
                { icon: "📓", label: "Review it calmly & journal" },
                { icon: "😤", label: "Vent to someone & move on" },
                { icon: "🤫", label: "Go quiet & process alone" },
                { icon: "🔁", label: "Jump back in to recover it" },
              ]}
              selected={lossResponse}
              onSelect={setLossResponse}
            />
          </div>
        );

      case 5:
        return (
          <div className="px-7 pb-32">
            <div className="text-[11px] font-semibold text-muted-foreground mb-4 tracking-wide">Step 5 of 7 · The real stuff</div>
            <h2 className="text-[28px] font-black text-foreground tracking-tight leading-tight mb-2">
              Let's get<br /><span className="text-gradient-accent">honest.</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6">This is where the magic happens — naming your patterns is the first step to fixing them.</p>

            <div className="text-sm font-bold text-foreground mb-3">What's your biggest struggle right now?</div>
            <PillSelect options={["Overtrading", "Revenge trading", "Not sticking to plan", "Fear of entering", "Moving stop loss", "FOMO entries", "Taking profits too early", "Emotional after losses", "No consistency", "Sizing up too fast"]} selected={struggles} onToggle={toggle(struggles, setStruggles)} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">Do you journal your trades?</div>
            <PillSelect options={["Every trade", "Sometimes", "Never — but I want to", "Never"]} selected={journaling} onToggle={toggle(journaling, setJournaling)} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">Do you have a trading plan?</div>
            <PillSelect options={["Yes and I follow it", "Yes but I drift from it", "Still building one", "No plan yet"]} selected={tradingPlan} onToggle={toggle(tradingPlan, setTradingPlan)} />
          </div>
        );

      case 6:
        return (
          <div className="px-7 pb-32">
            <div className="text-[11px] font-semibold text-muted-foreground mb-4 tracking-wide">Step 6 of 7 · Your people</div>
            <h2 className="text-[28px] font-black text-foreground tracking-tight leading-tight mb-2">
              Who are you<br /><span className="text-gradient-accent">looking for?</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6">You can pick more than one — you can be in a duo and a group at the same time.</p>

            <div className="text-sm font-bold text-foreground mb-3">I am a...</div>
            <GenderSelect options={["Male", "Female"]} selected={gender} onSelect={setGender} />

            <div className="text-sm font-bold text-foreground mb-3 mt-4">Looking to connect with...</div>
            <GenderSelect options={["Males", "Females", "Co-ed"]} selected={lookingFor} onSelect={setLookingFor} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">Connection reach</div>
            <ReachSelect selected={reach} onSelect={setReach} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">
              Your location
              {reach === "Local" && <span className="text-destructive ml-1">*</span>}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {reach === "Local" ? "Required for local matching" : "Optional — helps us match you with nearby traders"}
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  value={city} onChange={e => setCity(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  placeholder={reach === "Local" ? "City (required)" : "City"}
                />
              </div>
              <div className="flex items-center gap-3 border-b border-border pb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  value={state} onChange={e => setState(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  placeholder="State / Region / Province"
                />
              </div>
              <div className="flex items-center gap-3 border-b border-border pb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  value={country} onChange={e => setCountry(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  placeholder={reach === "Local" ? "Country (required)" : "Country"}
                />
              </div>
            </div>

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">What kind of connection?</div>
            <BigCardSelect
              options={[
                { icon: "🤝", title: "Partner(s)", description: "1-on-1 connections. No limit to how many partners you have." },
              ]}
              selected={connectionTypes}
              onToggle={toggle(connectionTypes, setConnectionTypes)}
            />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">How often do you want to connect?</div>
            <PillSelect options={["Daily", "After each session", "Weekly", "Flexible"]} selected={connectFreq} onToggle={toggle(connectFreq, setConnectFreq)} />

            <div className="h-px bg-border my-5" />
            <div className="text-sm font-bold text-foreground mb-3">What matters most in a match?</div>
            <PillSelect options={["Same strategy", "Same schedule", "Same goals", "Same experience level", "Same discipline level"]} selected={matchPriorities} onToggle={toggle(matchPriorities, setMatchPriorities)} />
          </div>
        );

      case 7:
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-7">
            <div className="w-16 h-16 rounded-full border-[3px] border-border border-t-success animate-spin mb-6" />
            <h2 className="text-[22px] font-black text-foreground mb-2">Finding your people...</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
              Matching you with traders who complement your style, goals, and schedule.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const ctaLabels: Record<number, string> = {
    0: "Let's Go!",
    1: "Continue", 2: "Continue", 3: "Continue", 4: "Continue",
    5: "Almost there",
    6: "Find my matches",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Nav bar (hidden on step 0 and 7) */}
      {step > 0 && step < 7 && (
        <div className="flex items-center justify-between px-7 pt-4 pb-2 shrink-0">
          <button onClick={() => goTo(step - 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:border-success transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <LogoHeader compact />
          <button onClick={() => goTo(Math.min(step + 1, 7))} className="text-xs font-semibold text-muted-foreground px-2 py-1">
            Skip
          </button>
        </div>
      )}

      {/* Progress bar */}
      {step > 0 && step < 7 && (
        <div className="px-7 pb-3 shrink-0">
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-400" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Content with slide animation */}
      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col min-h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      {step < 7 && (
        <div className="absolute bottom-0 left-0 right-0 p-7 pt-16 bg-gradient-to-t from-background via-background to-transparent z-10">
          <button
            onClick={async () => {
              if (step === 6) {
                // Validate age 18+
                if (dateOfBirth) {
                  const dob = new Date(dateOfBirth);
                  const today = new Date();
                  let age = today.getFullYear() - dob.getFullYear();
                  const m = today.getMonth() - dob.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                  if (age < 18) {
                    toast.error("You must be 18 or older to use Traders World");
                    return;
                  }
                }
                // Validate location if reach is Local
                if (reach === "Local" && (!city.trim() || !country.trim())) {
                  toast.error("City and Country are required for Local matching");
                  return;
                }
                goTo(7);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                   const user = session?.user;
                   if (!user) throw new Error("Not authenticated");

                  // Upload avatar if selected
                  let avatarUrl: string | null = null;
                  if (avatarFile) {
                    const ext = avatarFile.name.split(".").pop() || "jpg";
                    const filePath = `${user.id}/avatar.${ext}`;
                    const { error: uploadError } = await supabase.storage
                      .from("avatars")
                      .upload(filePath, avatarFile, { upsert: true });
                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabase.storage
                      .from("avatars")
                      .getPublicUrl(filePath);
                    avatarUrl = urlData.publicUrl;
                  }

                  // Build location string for display
                  const locationParts = [city, state, country].filter(Boolean);
                  const locationStr = locationParts.length > 0 ? locationParts.join(", ") : null;

                  const { error: profileError } = await supabase
                    .from("profiles")
                    .upsert({
                      id: user.id,
                      username: nickname || null,
                      avatar_url: avatarUrl,
                      gender,
                      date_of_birth: dateOfBirth || null,
                      location: locationStr,
                      city: city || null,
                      state: state || null,
                      country: country || null,
                      hobbies: offChartPrompts,
                      chart_prompts: chartPrompts,
                      off_chart_prompts: offChartPrompts,
                      onboarding_completed: true,
                      updated_at: new Date().toISOString(),
                    } as any, { onConflict: "id" });

                  if (profileError) throw profileError;

                  const { error: tradingError } = await supabase
                    .from("trading_profiles")
                    .upsert({
                      user_id: user.id,
                      markets,
                      instruments: instruments as any,
                      sessions,
                      trade_times: tradeTimes,
                      trading_style: styles,
                      strategies,
                      timeframes,
                      frequency,
                      experience_level: experience,
                      primary_goal: goals,
                      loss_response: lossResponse,
                      struggles,
                      journaling,
                      trading_plan: tradingPlan,
                      looking_for_gender: lookingFor,
                      connection_reach: reach,
                      connection_types: connectionTypes,
                      connect_frequency: connectFreq,
                      match_priorities: matchPriorities,
                      updated_at: new Date().toISOString(),
                    }, { onConflict: "user_id" });

                  if (tradingError) throw tradingError;

                  setTimeout(() => navigate("/discover", { replace: true }), 2500);
                } catch (err: any) {
                  console.error("Onboarding save error:", err);
                  toast.error("Failed to save your profile. Please try again.");
                  goTo(6);
                }
              } else {
                goTo(step + 1);
              }
            }}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-success text-[15px] font-bold text-primary-foreground flex items-center justify-center gap-2"
          >
            {ctaLabels[step]}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
