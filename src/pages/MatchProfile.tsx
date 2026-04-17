import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronDown, ChevronsUp, Bookmark, Gem, Zap, ChevronLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    const sharedMarkets = (trading.markets || []).filter((m) => (myTrading.markets || []).includes(m));
    const sharedStyles = (trading.trading_style || []).filter((m) => (myTrading.trading_style || []).includes(m));
    const sharedStrategies = (trading.strategies || []).filter((m) => (myTrading.strategies || []).includes(m));
    const sharedSessions = (trading.sessions || []).filter((m) => (myTrading.sessions || []).includes(m));
    if (sharedMarkets.length) reasons.push(`You both trade ${sharedMarkets.join(", ")}`);
    if (sharedStyles.length) reasons.push(`Shared trading style: ${sharedStyles.join(", ")}`);
    if (sharedStrategies.length) reasons.push(`Common strategy: ${sharedStrategies.join(", ")}`);
    if (sharedSessions.length) reasons.push(`Active in the same ${sharedSessions.join(", ")} session`);
    if (trading.experience_level && trading.experience_level === myTrading.experience_level) {
      reasons.push(`Same experience level: ${trading.experience_level}`);
    }
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Header */}
        <div className="px-5 pt-5 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Back"
          >
            <ChevronLeft className="w-7 h-7 text-foreground" strokeWidth={2.5} />
          </button>
          <h1 className="text-[24px] font-black tracking-tight text-foreground">
            TradersWorld
          </h1>
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
          <div className="px-4 mt-4">
            {/* Two-toned card */}
            <div className="bg-card rounded-3xl overflow-hidden border border-border">
              {/* Photo */}
              <div className="relative aspect-[4/5] bg-secondary">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <span className="text-6xl font-black text-foreground">
                      {(profile.full_name || profile.username || "?").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}

                {isPro && (
                  <div className="absolute top-4 left-4 bg-accent text-accent-foreground rounded-full pl-3 pr-4 py-1.5 flex items-center gap-1.5">
                    <Gem className="w-3.5 h-3.5" fill="currentColor" />
                    <span className="text-[13px] font-bold">Pro Trader</span>
                  </div>
                )}

                {/* Match badge */}
                <div className="absolute bottom-4 right-4 bg-background/85 backdrop-blur rounded-2xl px-3 py-2 flex items-center gap-2">
                  <div className="relative w-7 h-7">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round" strokeDasharray={dasharray} />
                    </svg>
                    <Zap className="absolute inset-0 m-auto w-3 h-3 text-accent" fill="currentColor" strokeWidth={0} />
                  </div>
                  <div className="leading-tight">
                    <div className="text-[16px] font-black text-foreground">{matchPct}%</div>
                    <div className="text-[10px] text-muted-foreground -mt-0.5">Match</div>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="px-5 pt-4 pb-5">
                {/* Name + age */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[20px] font-black text-accent truncate">
                    {profile.full_name || (profile.username ? `@${profile.username}` : "Trader")}
                  </span>
                  {age && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-[18px] font-black text-foreground">{age}</span>
                    </>
                  )}
                </div>

                {/* Pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {loc && (
                    <span className="px-3.5 py-1.5 rounded-full bg-accent text-accent-foreground text-[12px] font-bold">
                      {loc}
                    </span>
                  )}
                  {profile.gender && (
                    <span className="px-3.5 py-1.5 rounded-full border border-border text-foreground text-[12px] font-semibold">
                      {profile.gender}
                    </span>
                  )}
                  {trading?.markets?.[0] && (
                    <span className="px-3.5 py-1.5 rounded-full border border-border text-foreground text-[12px] font-semibold">
                      {trading.markets[0]} Trader
                    </span>
                  )}
                </div>

                {/* Why We Match */}
                <div className="mt-5">
                  <h3 className="text-[16px] font-black text-foreground mb-2">Why We Match</h3>
                  {reasons.length > 0 ? (
                    <ul className="space-y-1.5">
                      {reasons.map((r, i) => (
                        <li key={i} className="text-[14px] text-foreground/85 leading-[1.55] flex gap-2">
                          <span className="text-accent shrink-0">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[14px] text-foreground/70 leading-[1.55]">
                      Based on your shared trader profile and goals.
                    </p>
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Stat label="Trading Style" value={trading?.trading_style?.[0] || "—"} />
                  <Stat label="Strategy" value={trading?.strategies?.[0] || "—"} />
                  <Stat label="Session" value={trading?.sessions?.[0] || "—"} />
                </div>

                {/* Actions inside card */}
                <div className="mt-6 flex items-end justify-between">
                  <ActionButton
                    label="Pass"
                    onClick={handlePass}
                    disabled={busy}
                    bg="bg-background border border-border"
                    icon={<ChevronDown className="w-7 h-7 text-foreground" strokeWidth={2.5} />}
                  />
                  <ActionButton
                    label="Save"
                    onClick={handleSave}
                    disabled={busy}
                    bg="bg-muted"
                    icon={<Bookmark className="w-6 h-6 text-foreground" strokeWidth={2} />}
                  />
                  <ActionButton
                    label="Send Request"
                    onClick={handleSendRequest}
                    disabled={busy}
                    bg="bg-accent"
                    icon={<ChevronsUp className="w-7 h-7 text-accent-foreground" strokeWidth={2.5} />}
                  />
                </div>
              </div>
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

const ActionButton = ({
  label, icon, onClick, disabled, bg,
}: { label: string; icon: React.ReactNode; onClick: () => void; disabled: boolean; bg: string }) => (
  <div className="flex flex-col items-center gap-2">
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-[64px] h-[64px] rounded-full flex items-center justify-center ${bg} disabled:opacity-50 active:scale-95 transition-transform`}
    >
      {icon}
    </button>
    <span className="text-[12px] text-foreground font-medium">{label}</span>
  </div>
);

export default MatchProfile;
