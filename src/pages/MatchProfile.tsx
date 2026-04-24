import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronDown, ChevronsDown, ChevronsUp, Bookmark, Gem, Zap, ChevronLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import lockup from "@/assets/tradersworld-lockup.png";

interface ProfileFull {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  hobbies: string[] | null;
}

interface TradingFull {
  markets: string[] | null;
  trading_style: string[] | null;
  strategies: string[] | null;
  sessions: string[] | null;
  experience_level: string | null;
}

const calcAge = (dob: string | null) => {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

const MatchProfile = () => {
  const { userId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const matchPct: number = (location.state as any)?.matchPct ?? 0;

  const [profile, setProfile] = useState<ProfileFull | null>(null);
  const [trading, setTrading] = useState<any>(null);
  const [myTrading, setMyTrading] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [me, setMe] = useState<{ avatar_url: string | null; username: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const meUser = session?.user;
      const [{ data: p }, { data: t }, { data: mt }, { data: mp }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", userId).maybeSingle(),
        meUser ? supabase.from("trading_profiles").select("*").eq("user_id", meUser.id).maybeSingle() : Promise.resolve({ data: null } as any),
        meUser ? supabase.from("profiles").select("*").eq("id", meUser.id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      setProfile(p as any);
      setTrading(t);
      setMyTrading(mt);
      setMyProfile(mp);
      setMe(mp ? { avatar_url: (mp as any).avatar_url, username: (mp as any).username } : null);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handlePass = async () => {
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const u = session?.user;
    if (!u) { setBusy(false); return; }
    await supabase.from("passed_profiles").insert({ passer_id: u.id, passed_id: userId });
    toast({ title: "Passed", description: "You won't see this trader again." });
    setBusy(false);
    navigate("/discover");
  };

  const handleSave = async () => {
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const u = session?.user;
    if (!u) { setBusy(false); return; }
    const { error } = await supabase.from("saved_profiles").insert({ saver_id: u.id, saved_id: userId });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Added to My Saved." });
    }
    setBusy(false);
    navigate("/discover");
  };

  const handleSendRequest = async () => {
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const u = session?.user;
    if (!u) { setBusy(false); return; }
    const { error } = await supabase.from("partner_connections").insert({
      requester_id: u.id, receiver_id: userId, status: "pending", match_score: matchPct,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request sent!", description: "They'll be notified." });
    }
    setBusy(false);
    navigate("/discover");
  };

  const age = calcAge(profile?.date_of_birth ?? null);
  const loc = [profile?.city, profile?.state].filter(Boolean).join(", ") || profile?.country || "";
  const isPro = trading?.experience_level === "Profitable trader";
  const dasharray = `${(matchPct / 100) * 100.53} 100.53`;

  const reasons: string[] = [];
  if (trading && myTrading) {
    const inter = (a: any, b: any) => (a || []).filter((x: any) => (b || []).includes(x));
    const sharedMarkets = inter(trading.markets, myTrading.markets);
    const sharedStyles = inter(trading.trading_style, myTrading.trading_style);
    const sharedStrategies = inter(trading.strategies, myTrading.strategies);
    const sharedSessions = inter(trading.sessions, myTrading.sessions);
    const sharedTimeframes = inter(trading.timeframes, myTrading.timeframes);
    const sharedInstruments = inter(trading.instruments, myTrading.instruments);
    const sharedGoals = inter(trading.primary_goal, myTrading.primary_goal);
    const sharedConnTypes = inter(trading.connection_types, myTrading.connection_types);
    const sharedStruggles = inter(trading.struggles, myTrading.struggles);
    const sharedHobbies = inter(profile?.hobbies, myProfile?.hobbies);

    if (sharedMarkets.length) reasons.push(`Both trade ${sharedMarkets.join(", ")}`);
    if (sharedStyles.length) reasons.push(`Same trading style: ${sharedStyles.join(", ")}`);
    if (sharedStrategies.length) reasons.push(`Shared strategy: ${sharedStrategies.join(", ")}`);
    if (sharedSessions.length) reasons.push(`Active in the same ${sharedSessions.join(", ")} session`);
    if (sharedTimeframes.length) reasons.push(`Common timeframe: ${sharedTimeframes.join(", ")}`);
    if (sharedInstruments.length) reasons.push(`Trade the same instruments: ${sharedInstruments.slice(0, 3).join(", ")}`);
    if (trading.experience_level && trading.experience_level === myTrading.experience_level) {
      reasons.push(`Same experience level: ${trading.experience_level}`);
    }
    if (sharedGoals.length) reasons.push(`Same goal: ${sharedGoals.join(", ")}`);
    if (sharedConnTypes.length) reasons.push(`Both want: ${sharedConnTypes.join(", ")}`);
    if (sharedStruggles.length) reasons.push(`Relate on: ${sharedStruggles.slice(0, 2).join(", ")}`);
    if (sharedHobbies.length) reasons.push(`Shared interests: ${sharedHobbies.slice(0, 3).join(", ")}`);
    const sameCity = profile?.city && myProfile?.city && profile.city.toLowerCase() === myProfile.city.toLowerCase();
    const sameCountry = profile?.country && myProfile?.country && profile.country.toLowerCase() === myProfile.country.toLowerCase();
    if (sameCity) {
      const stateOrCountry = profile?.state || profile?.country;
      reasons.push(`Both based in ${profile.city}${stateOrCountry ? `, ${stateOrCountry}` : ""}`);
    } else if (sameCountry) {
      reasons.push(`Both based in ${profile.country}`);
    }
  }

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col pb-[88px]">
        {/* Header */}
        <div className="px-5 pt-5 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Back"
          >
            <ChevronLeft className="w-7 h-7 text-foreground" strokeWidth={2.5} />
          </button>
          <img src={lockup} alt="TradersWorld" className="h-6 w-auto" loading="eager" />
          <button
            onClick={() => navigate("/profile")}
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-border shrink-0"
          >
            {me?.avatar_url ? (
              <img src={me.avatar_url} className="w-full h-full object-cover" alt="me" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-black text-primary-foreground">
                {(me?.username || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
          </button>
        </div>

        {loading || !profile ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-4 mt-3 mt-auto">
            {/* Two-toned card */}
            <div className="relative">
              <div className="bg-card rounded-3xl overflow-hidden border border-border">
                {/* Photo — compact */}
                <div className="relative aspect-[16/10] bg-secondary">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="text-5xl font-black text-foreground">
                        {(profile.full_name || profile.username || "?").slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {isPro && (
                    <div className="absolute top-3 left-3 bg-accent text-accent-foreground rounded-full pl-2.5 pr-3 py-1 flex items-center gap-1.5">
                      <Gem className="w-3 h-3" fill="currentColor" />
                      <span className="text-[11px] font-bold">Pro Trader</span>
                    </div>
                  )}

                  {/* Match badge */}
                  <div className="absolute bottom-3 right-3 bg-background/85 backdrop-blur rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                    <div className="relative w-6 h-6">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round" strokeDasharray={dasharray} />
                      </svg>
                      <Zap className="absolute inset-0 m-auto w-2.5 h-2.5 text-accent" fill="currentColor" strokeWidth={0} />
                    </div>
                    <div className="leading-tight">
                      <div className="text-[14px] font-black text-foreground">{matchPct}%</div>
                      <div className="text-[9px] text-muted-foreground -mt-0.5">Match</div>
                    </div>
                  </div>
                </div>

                {/* Card body — tight */}
                <div className="px-4 pt-3 pb-10">
                  {/* Name + age */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[17px] font-black text-accent truncate">
                      {profile.full_name || (profile.username ? `@${profile.username}` : "Trader")}
                    </span>
                    {age && (
                      <>
                        <span className="text-muted-foreground text-sm">•</span>
                        <span className="text-[15px] font-black text-foreground">{age}</span>
                      </>
                    )}
                  </div>

                  {/* Pills — single row */}
                  <div className="mt-2 flex items-center gap-1.5 flex-nowrap overflow-hidden">
                    {loc && (
                      <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold whitespace-nowrap">
                        {loc}
                      </span>
                    )}
                    {profile.gender && (
                      <span className="px-2.5 py-1 rounded-full border border-border text-foreground text-[10px] font-semibold whitespace-nowrap">
                        {profile.gender}
                      </span>
                    )}
                    {trading?.markets?.[0] && (
                      <span className="px-2.5 py-1 rounded-full border border-border text-foreground text-[10px] font-semibold whitespace-nowrap">
                        {trading.markets[0]} Trader
                      </span>
                    )}
                  </div>

                  {/* Why We Match */}
                  <div className="mt-3">
                    <h3 className="text-[13px] font-black text-foreground mb-1">Why We Match</h3>
                    {reasons.length > 0 ? (
                      <ul className="space-y-0.5">
                        {reasons.map((r, i) => (
                          <li key={i} className="text-[11.5px] text-foreground/85 leading-[1.4] flex gap-1.5">
                            <span className="text-accent shrink-0">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11.5px] text-foreground/70 leading-[1.4]">
                        Based on your shared trader profile and goals.
                      </p>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Stat label="Trading Style" value={trading?.trading_style?.[0] || "—"} />
                    <Stat label="Strategy" value={trading?.strategies?.[0] || "—"} />
                    <Stat label="Session" value={trading?.sessions?.[0] || "—"} />
                  </div>
                </div>
              </div>

              {/* Action circles straddle card edge */}
              <div className="absolute inset-x-0 top-full -mt-8 z-10 px-5">
                <div className="grid grid-cols-3 place-items-center">
                  <ActionCircleButton
                    ariaLabel="Pass"
                    onClick={handlePass}
                    disabled={busy}
                    bg="bg-foreground"
                    icon={<ChevronsDown className="w-6 h-6 text-background" strokeWidth={2.5} />}
                  />
                  <ActionCircleButton
                    ariaLabel="Save"
                    onClick={handleSave}
                    disabled={busy}
                    bg="bg-muted"
                    icon={
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                        <path d="M8 3h8a2 2 0 0 1 2 2v3" />
                        <path d="M6 7h8a2 2 0 0 1 2 2v12l-6-4-6 4V9a2 2 0 0 1 2-2z" />
                      </svg>
                    }
                  />
                  <ActionCircleButton
                    ariaLabel="Send Request"
                    onClick={handleSendRequest}
                    disabled={busy}
                    bg="bg-accent"
                    icon={<ChevronsUp className="w-6 h-6 text-background" strokeWidth={2.5} />}
                  />
                </div>
              </div>
            </div>

            {/* Action labels */}
            <div className="mt-10 grid grid-cols-3 place-items-center px-5">
              <ActionLabel label="Pass" />
              <ActionLabel label="Save" />
              <ActionLabel label="Send Request" />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[15px] font-black text-accent truncate">{value}</div>
    <div className="text-[12px] text-foreground/70">{label}</div>
  </div>
);

const ActionCircleButton = ({
  ariaLabel, icon, onClick, disabled, bg,
}: { ariaLabel: string; icon: React.ReactNode; onClick: () => void; disabled: boolean; bg: string }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    disabled={disabled}
    className={`w-[64px] h-[64px] rounded-full flex items-center justify-center ${bg} shadow-md disabled:opacity-50 active:scale-95 transition-transform`}
  >
    {icon}
  </button>
);

const ActionLabel = ({ label }: { label: string }) => (
  <span className="text-[12px] text-foreground font-medium">{label}</span>
);

export default MatchProfile;
