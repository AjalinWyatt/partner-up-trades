import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, Edit, Share2, ImageIcon, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

interface ProfileData {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  gender: string | null;
  location: string | null;
  hobbies: string[];
  chart_prompts: string[];
  off_chart_prompts: string[];
  onboarding_completed: boolean;
}

interface TradingProfileData {
  markets: string[];
  sessions: string[];
  trading_style: string[];
  strategies: string[];
  timeframes: string[];
  experience_level: string | null;
  primary_goal: string[];
  struggles: string[];
  frequency: string[];
  journaling: string[];
  trading_plan: string[];
  looking_for_gender: string | null;
  connection_reach: string | null;
  connection_types: string[];
  connect_frequency: string[];
  match_priorities: string[];
}

const Profile = () => {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tradingProfile, setTradingProfile] = useState<TradingProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const stats = { partners: 0, followers: 0 };

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: pData }, { data: tData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (pData) setProfile(pData);
      if (tData) setTradingProfile(tData);
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const getInitials = () => {
    if (!profile?.full_name) return "?";
    return profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const displayName = profile?.full_name || "Your Name";
  const displayUsername = profile?.username ? `@${profile.username}` : "@username";

  // Detail sections - only shown if data exists
  const detailSections = [
    { title: "Markets", data: tradingProfile?.markets },
    { title: "Trading style", data: tradingProfile?.trading_style },
    { title: "Strategies", data: tradingProfile?.strategies },
    { title: "Timeframes", data: tradingProfile?.timeframes },
    { title: "Sessions", data: tradingProfile?.sessions },
    { title: "Struggles", data: tradingProfile?.struggles },
    { title: "Hobbies", data: profile?.hobbies },
    { title: "Watching for", data: profile?.chart_prompts },
    { title: "Off the charts", data: profile?.off_chart_prompts },
  ];

  const hasAnyDetails = detailSections.some(s => s.data && s.data.length > 0) ||
    !!tradingProfile?.experience_level ||
    (tradingProfile?.primary_goal && tradingProfile.primary_goal.length > 0);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-14 items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-14">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className="text-base font-extrabold text-foreground">{displayUsername}</span>
        <div className="flex gap-2.5">
          <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={1.6} />
          <Settings className="w-5 h-5 text-muted-foreground" strokeWidth={1.6} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-5 px-5 py-1.5">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-[76px] h-[76px] rounded-full object-cover" />
            ) : (
              <div className="w-[76px] h-[76px] rounded-full bg-muted flex items-center justify-center text-2xl font-black text-muted-foreground">
                {getInitials()}
              </div>
            )}
          </div>
          <div className="flex-1 grid grid-cols-3 text-center">
            {[
              { n: String(stats.partners), l: "Partners" },
              { n: String(stats.followers), l: "Followers" },
            ].map(s => (
              <div key={s.l}>
                <div className="text-lg font-black text-foreground">{s.n}</div>
                <div className="text-[11px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="px-5 py-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-foreground">{displayName}</span>
            <div className="flex gap-1.5">
              <button className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center">
                <Edit className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
              </button>
              <button className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center">
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
              </button>
            </div>
          </div>
          {profile?.gender && <div className="text-[11px] text-muted-foreground mt-0.5">{profile.gender}</div>}
          {profile?.location && (
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {profile.location}
            </div>
          )}
        </div>

        {/* Market pills */}
        {tradingProfile?.markets && tradingProfile.markets.length > 0 && (
          <div className="flex flex-wrap gap-1 px-5 py-1.5">
            {tradingProfile.markets.map(m => (
              <span key={m} className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-success text-[10px] font-bold text-primary-foreground">{m}</span>
            ))}
          </div>
        )}

        {/* Experience badge */}
        {tradingProfile?.experience_level && (
          <div className="px-5 py-1">
            <span className="px-2.5 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {tradingProfile.experience_level}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-b border-border mt-2">
          {["Posts", "Details"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex-1 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider relative transition-colors",
                activeTab === i ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab}
              {activeTab === i && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-primary to-success" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 ? (
          /* Posts - empty state */
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No posts yet</p>
            <p className="text-xs text-muted-foreground mb-4">Start sharing your trading journey, setups, reflections, and progress.</p>
            <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-success text-xs font-bold text-primary-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Create first post
            </button>
          </div>
        ) : (
          /* Details tab */
          hasAnyDetails ? (
            <div className="px-5 py-3 space-y-2">
              {/* Experience & Goals */}
              {(tradingProfile?.experience_level || (tradingProfile?.primary_goal && tradingProfile.primary_goal.length > 0)) && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Trading details</div>
                  {tradingProfile?.experience_level && (
                    <div className="flex justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-[11px] text-muted-foreground">Experience</span>
                      <span className="text-[11px] font-bold text-foreground">{tradingProfile.experience_level}</span>
                    </div>
                  )}
                  {tradingProfile?.primary_goal && tradingProfile.primary_goal.length > 0 && (
                    <div className="flex justify-between py-1.5">
                      <span className="text-[11px] text-muted-foreground">Goals</span>
                      <span className="text-[11px] font-bold text-foreground">{tradingProfile.primary_goal.join(", ")}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Pill-based sections */}
              {detailSections.map(section => {
                if (!section.data || section.data.length === 0) return null;
                return (
                  <div key={section.title} className="bg-card border border-border rounded-xl p-3">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{section.title}</div>
                    <div className="flex flex-wrap gap-1">
                      {section.data.map(d => (
                        <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No details yet</p>
              <p className="text-xs text-muted-foreground">Complete your profile to show your trading identity.</p>
            </div>
          )
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
