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

  // Step 2
  const [markets, setMarkets] = useState<string[]>([]);
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
          <div className="flex-1 flex flex-col items-center justify-center text-center px-7 pb-32">
            <AnimatedGlobe />
            <h1 className="text-[28px] font-black text-foreground tracking-tight leading-tight mt-6 mb-3">
              Trading is better<br />with <span className="text-gradient-accent">your people.</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px] mb-8">
              Find your accountability partner, circle, or crew — matched to how you actually trade.
            </p>
            <div className="flex gap-14">
              {[
                { num: traderCount.toLocaleString(), label: "Active traders" },
                { num: partnershipCount.toLocaleString(), label: "Partnerships" },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-[22px] font-black text-gradient-accent">{s.num}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="px-7 pb-32">
            <div className="text-[11px] font-semibold text-muted-foreground mb-4 tracking-wide">Step 1 of 7 · About you</div>
            <h2 className="text-[28px] font-black text-foreground tracking-tight leading-tight mb-2">
              First, let's build<br />your <span className="text-gradient-accent">profile.</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6">This is how other traders will find and recognise you.</p>

            <div className="text-sm font-bold text-foreground mb-3">What should we call you?</div>
            <Input
              placeholder="First name or nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground mb-4"
            />

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
            <div
              className="flex items-center gap-3.5 mb-4 cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-accent/60 flex items-center justify-center shrink-0 hover:border-accent transition-colors overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-foreground">
                  {avatarPreview ? "Change photo" : "Add a photo (optional)"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Just you, clearly visible.</div>
              </div>
            </div>

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
              options={["Gym", "Football", "Basketball", "Music", "Travel", "Cars", "Gaming", "Family time", "Cooking", "Reading", "Content creation", "Fitness", "Golf", "Business", "Crypto investing", "Meditation"]}
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
            <PillSelect options={["Forex", "Crypto", "Stocks", "Indices", "Options", "Futures", "ETFs", "Commodities", "Bonds"]} selected={markets} onToggle={toggle(markets, setMarkets)} />

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
            <div className="text-sm font-bold text-foreground mb-3">What kind of connection?</div>
            <BigCardSelect
              options={[
                { icon: "🤝", title: "Partner(s)", description: "1-on-1 connections. No limit to how many partners you have." },
                { icon: "🔺", title: "Small Group", description: "3–5 traders. Tight-knit, weekly reviews." },
                { icon: "🌐", title: "Circle Group", description: "Up to 10 traders. Bigger energy, shared analysis." },
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
    0: "Let's find your people",
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
                goTo(7);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
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

                  const { error: profileError } = await supabase
                    .from("profiles")
                    .upsert({
                      id: user.id,
                      username: nickname || null,
                      avatar_url: avatarUrl,
                      gender,
                      hobbies: offChartPrompts,
                      chart_prompts: chartPrompts,
                      off_chart_prompts: offChartPrompts,
                      onboarding_completed: true,
                      updated_at: new Date().toISOString(),
                    }, { onConflict: "id" });

                  if (profileError) throw profileError;

                  const { error: tradingError } = await supabase
                    .from("trading_profiles")
                    .upsert({
                      user_id: user.id,
                      markets,
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

                  setTimeout(() => navigate("/profile"), 2500);
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
