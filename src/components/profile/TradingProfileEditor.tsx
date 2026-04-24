import type { Dispatch, SetStateAction } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PillSelect from "@/components/onboarding/PillSelect";

export interface ProfileEditorDraft {
  gender: string;
  city: string;
  state: string;
  country: string;
  hobbies: string[];
  chart_prompts: string[];
  off_chart_prompts: string[];
}

export interface TradingEditorDraft {
  markets: string[];
  instruments: string[];
  sessions: string[];
  trade_times: string[];
  trading_style: string[];
  strategies: string[];
  timeframes: string[];
  frequency: string[];
  experience_level: string;
  primary_goal: string[];
  loss_response: string[];
  struggles: string[];
  journaling: string[];
  trading_plan: string[];
  looking_for_gender: string;
  connection_reach: string;
  connect_frequency: string[];
  match_priorities: string[];
}

interface TradingProfileEditorProps {
  profileDraft: ProfileEditorDraft;
  setProfileDraft: Dispatch<SetStateAction<ProfileEditorDraft>>;
  tradingDraft: TradingEditorDraft;
  setTradingDraft: Dispatch<SetStateAction<TradingEditorDraft>>;
}

const forexInstrumentOptions = ["Major pairs", "Minor pairs", "Indices (NAS100, US30)", "Gold/XAU", "Exotics"];
const futuresInstrumentOptions = ["Equity indices (NQ, ES, YM, RTY)", "Commodities (Oil, Gas, Wheat)", "Crypto futures (BTC, ETH)", "Metals"];
const optionsInstrumentOptions = ["Stock options", "Index options (SPX, NDX)", "ETF options", "Futures options"];

const TradingProfileEditor = ({ profileDraft, setProfileDraft, tradingDraft, setTradingDraft }: TradingProfileEditorProps) => {
  const toggleTradingArray = (key: keyof TradingEditorDraft, value: string) => {
    setTradingDraft((current) => {
      const list = current[key];
      if (!Array.isArray(list)) return current;
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  const toggleProfileArray = (key: keyof ProfileEditorDraft, value: string) => {
    setProfileDraft((current) => {
      const list = current[key];
      if (!Array.isArray(list)) return current;
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  const setTradingValue = (key: keyof TradingEditorDraft, value: string) => {
    setTradingDraft((current) => ({ ...current, [key]: value }));
  };

  const setProfileValue = (key: keyof ProfileEditorDraft, value: string) => {
    setProfileDraft((current) => ({ ...current, [key]: value }));
  };

  const instrumentOptions = [
    ...(tradingDraft.markets.includes("Forex") ? forexInstrumentOptions : []),
    ...(tradingDraft.markets.includes("Futures") ? futuresInstrumentOptions : []),
    ...(tradingDraft.markets.includes("Options") ? optionsInstrumentOptions : []),
  ];

  return (
    <div className="pt-2">
      <div className="mb-3">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Trading & onboarding details</label>
        <p className="mt-1 text-xs text-muted-foreground">Open only the sections you want to change.</p>
      </div>

      <Accordion type="multiple" className="rounded-2xl border border-border bg-card px-4">
        <AccordionItem value="basics" className="border-border/70">
          <AccordionTrigger className="py-4 text-sm font-bold text-foreground hover:no-underline">Basics & location</AccordionTrigger>
          <AccordionContent className="space-y-5 pt-1">
            <SingleSelectRow
              label="Gender"
              options={["Male", "Female", "Prefer Not To Say"]}
              value={profileDraft.gender}
              onChange={(value) => setProfileValue("gender", value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <EditorField label="City" value={profileDraft.city} onChange={(value) => setProfileValue("city", value)} placeholder="City" />
              <EditorField label="State / Region" value={profileDraft.state} onChange={(value) => setProfileValue("state", value)} placeholder="State / Region" />
            </div>
            <EditorField label="Country" value={profileDraft.country} onChange={(value) => setProfileValue("country", value)} placeholder="Country" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="markets" className="border-border/70">
          <AccordionTrigger className="py-4 text-sm font-bold text-foreground hover:no-underline">Market & session</AccordionTrigger>
          <AccordionContent className="space-y-5 pt-1">
            <MultiSelectSection label="Markets" options={["Forex", "Futures", "Options"]} selected={tradingDraft.markets} onToggle={(value) => toggleTradingArray("markets", value)} />
            {instrumentOptions.length > 0 && (
              <MultiSelectSection label="Instruments" options={instrumentOptions} selected={tradingDraft.instruments} onToggle={(value) => toggleTradingArray("instruments", value)} />
            )}
            <MultiSelectSection label="Sessions" options={["London", "New York", "Asian", "Multiple / flexible"]} selected={tradingDraft.sessions} onToggle={(value) => toggleTradingArray("sessions", value)} />
            <MultiSelectSection label="Typical trade times" options={["Morning", "Afternoon", "Evening", "Night", "Varies"]} selected={tradingDraft.trade_times} onToggle={(value) => toggleTradingArray("trade_times", value)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="approach" className="border-border/70">
          <AccordionTrigger className="py-4 text-sm font-bold text-foreground hover:no-underline">Approach</AccordionTrigger>
          <AccordionContent className="space-y-5 pt-1">
            <MultiSelectSection label="Trading style" options={["Scalper", "Swing", "Day Trader", "Position"]} selected={tradingDraft.trading_style} onToggle={(value) => toggleTradingArray("trading_style", value)} />
            <MultiSelectSection label="Strategy approach" options={["Supply/Demand", "Price Action", "Smart Money/ICT", "ICC", "Indicators", "Mixed"]} selected={tradingDraft.strategies} onToggle={(value) => toggleTradingArray("strategies", value)} />
            <MultiSelectSection label="Timeframes" options={["1-30m", "1H-2H", "4H-Daily", "Weekly-Monthly", "Mixed"]} selected={tradingDraft.timeframes} onToggle={(value) => toggleTradingArray("timeframes", value)} />
            <MultiSelectSection label="How often you trade" options={["Daily", "Few times a week", "High quality only", "Inconsistent"]} selected={tradingDraft.frequency} onToggle={(value) => toggleTradingArray("frequency", value)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mindset" className="border-border/70">
          <AccordionTrigger className="py-4 text-sm font-bold text-foreground hover:no-underline">Experience & mindset</AccordionTrigger>
          <AccordionContent className="space-y-5 pt-1">
            <SingleSelectRow
              label="Experience level"
              options={["Beginner", "Intermediate", "Advanced", "Professional"]}
              value={tradingDraft.experience_level}
              onChange={(value) => setTradingValue("experience_level", value)}
            />
            <MultiSelectSection label="Current goals" options={["Learn the basics", "Get consistently profitable", "Pass a prop challenge", "Scale funded accounts", "Go full-time"]} selected={tradingDraft.primary_goal} onToggle={(value) => toggleTradingArray("primary_goal", value)} />
            <MultiSelectSection label="After a loss" options={["Review it calmly & journal", "Vent to someone & move on", "Go quiet & process alone", "Jump back in to recover it"]} selected={tradingDraft.loss_response} onToggle={(value) => toggleTradingArray("loss_response", value)} />
            <MultiSelectSection label="Biggest struggles" options={["Overtrading", "Revenge trading", "Not sticking to plan", "FOMO entries", "Moving stop loss"]} selected={tradingDraft.struggles} onToggle={(value) => toggleTradingArray("struggles", value)} />
            <MultiSelectSection label="Journaling habits" options={["Daily", "Sometimes", "Only after losses", "Not yet"]} selected={tradingDraft.journaling} onToggle={(value) => toggleTradingArray("journaling", value)} />
            <MultiSelectSection label="Trading plan" options={["Yes", "No"]} selected={tradingDraft.trading_plan} onToggle={(value) => toggleTradingArray("trading_plan", value)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="matching" className="border-border/70">
          <AccordionTrigger className="py-4 text-sm font-bold text-foreground hover:no-underline">Matching preferences</AccordionTrigger>
          <AccordionContent className="space-y-5 pt-1">
            <SingleSelectRow label="Looking for" options={["Male", "Female", "Co-Ed"]} value={tradingDraft.looking_for_gender} onChange={(value) => setTradingValue("looking_for_gender", value)} />
            <SingleSelectRow label="Connection reach" options={["Local", "Global", "Both"]} value={tradingDraft.connection_reach} onChange={(value) => setTradingValue("connection_reach", value)} />
            <MultiSelectSection label="Connection frequency" options={["Daily", "After session", "Weekly", "Flexible"]} selected={tradingDraft.connect_frequency} onToggle={(value) => toggleTradingArray("connect_frequency", value)} />
            <MultiSelectSection label="Match priorities" options={["Same Strategy", "Same Session", "Same Goals", "Same Experience Level", "Interests"]} selected={tradingDraft.match_priorities} onToggle={(value) => toggleTradingArray("match_priorities", value)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="prompts" className="border-b-0">
          <AccordionTrigger className="py-4 text-sm font-bold text-foreground hover:no-underline">Chart prompts</AccordionTrigger>
          <AccordionContent className="space-y-5 pt-1">
            <MultiSelectSection label="What you look for in charts" options={["Order blocks", "FVGs", "Key levels", "Fibonacci", "Support & resistance", "Liquidity zones", "Market structure", "BOS / CHOCH", "Moving averages", "VWAP", "Volume profile", "Supply & demand", "Imbalances", "EMA crosses", "RSI divergence", "Trendlines"]} selected={profileDraft.chart_prompts} onToggle={(value) => toggleProfileArray("chart_prompts", value)} />
            <MultiSelectSection label="Off the charts" options={["Gym", "Football", "Basketball", "Music", "Travel", "Cars", "Gaming", "Family time", "Cooking", "Reading", "Content creation", "Fitness", "Golf", "Business", "Meditation"]} selected={profileDraft.off_chart_prompts} onToggle={(value) => toggleProfileArray("off_chart_prompts", value)} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

const MultiSelectSection = ({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) => (
  <div>
    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <PillSelect options={options} selected={selected} onToggle={onToggle} />
  </div>
);

const SingleSelectRow = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) => (
  <div>
    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={active ? "rounded-full border border-accent bg-accent px-5 py-2.5 text-[14px] font-medium text-accent-foreground transition-all" : "rounded-full border border-border bg-transparent px-5 py-2.5 text-[14px] font-medium text-foreground transition-all hover:border-accent/60"}
          >
            {option}
          </button>
        );
      })}
    </div>
  </div>
);

const EditorField = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) => (
  <div>
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      placeholder={placeholder}
    />
  </div>
);

export default TradingProfileEditor;