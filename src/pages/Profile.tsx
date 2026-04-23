import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, Edit, Share2, ImageIcon, Plus, Camera, ArrowLeft, Grid3x3, MapPin, LogOut, Sun, Moon, Flame, TrendingUp, Users, ChevronDown, Search, Menu, Repeat2, MessageCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/AppLayout";
import CreatePostModal from "@/components/CreatePostModal";
import PostDetailModal from "@/components/PostDetailModal";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { toast } from "sonner";
import TradingProfileEditor, { type ProfileEditorDraft, type TradingEditorDraft } from "@/components/profile/TradingProfileEditor";

interface ProfileData {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  gender: string | null;
  bio: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editGender, setEditGender] = useState("");
  const [profileDraft, setProfileDraft] = useState<ProfileEditorDraft>({ gender: "", city: "", state: "", country: "", hobbies: [], chart_prompts: [], off_chart_prompts: [] });
  const [tradingDraft, setTradingDraft] = useState<TradingEditorDraft>({ markets: [], instruments: [], sessions: [], trade_times: [], trading_style: [], strategies: [], timeframes: [], frequency: [], experience_level: "", primary_goal: [], loss_response: [], struggles: [], journaling: [], trading_plan: [], looking_for_gender: "", connection_reach: "", connect_frequency: [], match_priorities: [] });

  const [partnerCount, setPartnerCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: pData }, { data: tData }, { count }, { data: entries }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("partner_connections").select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq("status", "accepted"),
        supabase.from("journal_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);

      if (pData) {
        setProfile(pData as any);
        setEditName(pData.full_name || "");
        setEditUsername(pData.username || "");
        setEditBio((pData as any).bio || "");
        setEditCity((pData as any).city || "");
        setEditState((pData as any).state || "");
        setEditCountry((pData as any).country || "");
        setEditGender(pData.gender || "");
        setProfileDraft({
          gender: pData.gender || "",
          city: (pData as any).city || "",
          state: (pData as any).state || "",
          country: (pData as any).country || "",
          hobbies: pData.hobbies || [],
          chart_prompts: pData.chart_prompts || [],
          off_chart_prompts: pData.off_chart_prompts || [],
        });
      }
      if (tData) {
        setTradingProfile(tData);
        setTradingDraft({
          markets: tData.markets || [],
          instruments: (tData as any).instruments || [],
          sessions: tData.sessions || [],
          trade_times: (tData as any).trade_times || [],
          trading_style: tData.trading_style || [],
          strategies: tData.strategies || [],
          timeframes: tData.timeframes || [],
          frequency: tData.frequency || [],
          experience_level: tData.experience_level || "",
          primary_goal: tData.primary_goal || [],
          loss_response: typeof (tData as any).loss_response === "string" ? (tData as any).loss_response.split(", ").filter(Boolean) : [],
          struggles: tData.struggles || [],
          journaling: (tData as any).journaling || [],
          trading_plan: (tData as any).trading_plan || [],
          looking_for_gender: tData.looking_for_gender || "",
          connection_reach: tData.connection_reach || "",
          connect_frequency: (tData as any).connect_frequency || [],
          match_priorities: (tData as any).match_priorities || [],
        });
      }
      setPartnerCount(count ?? 0);

      // Streak
      if (entries && entries.length > 0) {
        const days = new Set(entries.map((e: any) => e.created_at.slice(0, 10)));
        let s = 0;
        let d = new Date();
        for (let i = 0; i < 30; i++) {
          if (days.has(d.toISOString().slice(0, 10))) { s++; d = new Date(d.getTime() - 86400000); }
          else break;
        }
        setStreak(s);
      }

      // Win rate
      const withResult = (entries || []).filter((e: any) => e.result === "Win" || e.result === "Loss");
      const wins = withResult.filter((e: any) => e.result === "Win").length;
      setWinRate(withResult.length > 0 ? Math.round((wins / withResult.length) * 100) : 0);

      const { data: postsData } = await supabase
        .from("posts" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPosts(postsData || []);

      setLoading(false);
    };
    fetchProfile();
  }, []);

  const getInitials = () => {
    if (!profile?.full_name) return "?";
    return profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
    toast.success("Avatar updated!");
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const nextCity = profileDraft.city || editCity;
    const nextState = profileDraft.state || editState;
    const nextCountry = profileDraft.country || editCountry;
    const nextGender = profileDraft.gender || editGender;
    const locationParts = [nextCity, nextState, nextCountry].filter(Boolean);
    const locationStr = locationParts.length > 0 ? locationParts.join(", ") : null;
    const { error: profileError } = await supabase.from("profiles").update({
      full_name: editName || null,
      username: editUsername || null,
      bio: editBio || null,
      location: locationStr,
      city: nextCity || null,
      state: nextState || null,
      country: nextCountry || null,
      gender: nextGender || null,
      hobbies: profileDraft.hobbies,
      chart_prompts: profileDraft.chart_prompts,
      off_chart_prompts: profileDraft.off_chart_prompts,
      updated_at: new Date().toISOString(),
    } as any).eq("id", userId);
    const { error: tradingError } = await supabase.from("trading_profiles").update({
      markets: tradingDraft.markets,
      instruments: tradingDraft.instruments,
      sessions: tradingDraft.sessions,
      trade_times: tradingDraft.trade_times,
      trading_style: tradingDraft.trading_style,
      strategies: tradingDraft.strategies,
      timeframes: tradingDraft.timeframes,
      frequency: tradingDraft.frequency,
      experience_level: tradingDraft.experience_level || null,
      primary_goal: tradingDraft.primary_goal,
      loss_response: tradingDraft.loss_response.join(", ") || null,
      struggles: tradingDraft.struggles,
      journaling: tradingDraft.journaling,
      trading_plan: tradingDraft.trading_plan,
      looking_for_gender: tradingDraft.looking_for_gender || null,
      connection_reach: tradingDraft.connection_reach || null,
      connect_frequency: tradingDraft.connect_frequency,
      match_priorities: tradingDraft.match_priorities,
      updated_at: new Date().toISOString(),
    } as any).eq("user_id", userId);
    setSaving(false);
    if (profileError || tradingError) { toast.error("Failed to save"); return; }
    setProfile(prev => prev ? {
      ...prev, full_name: editName || null, username: editUsername || null,
      bio: editBio || null, location: locationStr, city: nextCity || null,
      state: nextState || null, country: nextCountry || null, gender: nextGender || null,
      hobbies: profileDraft.hobbies, chart_prompts: profileDraft.chart_prompts, off_chart_prompts: profileDraft.off_chart_prompts,
    } : prev);
    setTradingProfile(prev => prev ? {
      ...prev,
      markets: tradingDraft.markets,
      sessions: tradingDraft.sessions,
      trading_style: tradingDraft.trading_style,
      strategies: tradingDraft.strategies,
      timeframes: tradingDraft.timeframes,
      experience_level: tradingDraft.experience_level || null,
      primary_goal: tradingDraft.primary_goal,
      struggles: tradingDraft.struggles,
      frequency: tradingDraft.frequency,
      journaling: tradingDraft.journaling,
      trading_plan: tradingDraft.trading_plan,
      looking_for_gender: tradingDraft.looking_for_gender || null,
      connection_reach: tradingDraft.connection_reach || null,
      connect_frequency: tradingDraft.connect_frequency,
      match_priorities: tradingDraft.match_priorities,
    } : prev);
    setEditing(false);
    toast.success("Profile updated!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const displayUsername = profile?.username ? `@${profile.username}` : "@username";
  const displayLocation = (() => {
    if (!profile) return null;
    const { city, state, country } = profile;
    const parts = [city, state, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : profile.location || null;
  })();

  const detailSections = [
    { title: "Markets", data: tradingProfile?.markets, icon: "📊" },
    { title: "Trading Style", data: tradingProfile?.trading_style, icon: "⚡" },
    { title: "Strategies", data: tradingProfile?.strategies, icon: "🎯" },
    { title: "Timeframes", data: tradingProfile?.timeframes, icon: "⏱" },
    { title: "Sessions", data: tradingProfile?.sessions, icon: "🌍" },
    { title: "Struggles", data: tradingProfile?.struggles, icon: "💪" },
    { title: "Hobbies", data: profile?.hobbies, icon: "🎮" },
  ];

  const hasAnyDetails = detailSections.some(s => s.data && s.data.length > 0) ||
    !!tradingProfile?.experience_level ||
    (tradingProfile?.primary_goal && tradingProfile.primary_goal.length > 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Edit view
  if (editing) {
    return (
      <AppLayout>
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <button onClick={() => setEditing(false)} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
            <span className="text-base font-extrabold text-foreground">Edit Profile</span>
            <button onClick={handleSaveProfile} disabled={saving} className="text-sm font-bold text-primary hover:text-primary/80">{saving ? "Saving..." : "Done"}</button>
          </div>

          <div className="flex justify-center py-5">
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => avatarInputRef.current?.click()} className="relative group">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-black text-muted-foreground ring-2 ring-border">{getInitials()}</div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>
              <button onClick={() => avatarInputRef.current?.click()} className="text-xs font-bold text-primary">Change photo</button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          <div className="px-5 space-y-4 pb-8">
            <EditField label="Full Name" value={editName} onChange={setEditName} placeholder="Your full name" />
            <EditField label="Username" value={editUsername} onChange={setEditUsername} placeholder="username" />
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Bio</label>
              <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="bg-secondary border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-primary min-h-[80px] resize-none" placeholder="Tell traders about yourself..." maxLength={150} />
              <div className="text-[10px] text-muted-foreground text-right mt-1">{editBio.length}/150</div>
            </div>
            <EditField label="City" value={editCity} onChange={setEditCity} placeholder="City" />
            <EditField label="State / Region / Province" value={editState} onChange={setEditState} placeholder="State / Region" />
            <EditField label="Country" value={editCountry} onChange={setEditCountry} placeholder="Country" />
            <EditField label="Gender" value={editGender} onChange={setEditGender} placeholder="Gender" />
            <TradingProfileEditor profileDraft={profileDraft} setProfileDraft={setProfileDraft} tradingDraft={tradingDraft} setTradingDraft={setTradingDraft} />

            <div className="pt-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Appearance</label>
              <div className="flex items-center justify-between bg-secondary border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {isDark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm text-foreground">Dark mode</span>
                </div>
                <button
                  onClick={() => {
                    const next = !isDark;
                    setIsDark(next);
                    document.documentElement.classList.toggle("dark", next);
                    localStorage.setItem("theme", next ? "dark" : "light");
                  }}
                  className={`relative w-10 h-[22px] rounded-full transition-colors ${isDark ? "bg-primary" : "bg-muted"}`}
                >
                  <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${isDark ? "left-[20px]" : "left-[2px]"}`} />
                </button>
              </div>
            </div>

            <button onClick={handleLogout} className="w-full py-3 rounded-xl border border-destructive/30 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="flex items-center justify-between px-5 pt-4">
          <button onClick={() => navigate("/feed")} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreatePost(true)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button onClick={() => navigate("/notifications")} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted">
              <Bell className="w-4 h-4" strokeWidth={2} />
            </button>
            <button onClick={() => setEditing(true)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted">
              <Menu className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button onClick={() => avatarInputRef.current?.click()} className="relative group mb-4 block">
                <div className="h-[84px] w-[84px] rounded-full border border-border bg-background p-[3px] shadow-lg">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-2xl font-black text-primary-foreground">
                      {getInitials()}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-background bg-success" />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>

              <div className="flex items-center gap-1.5">
                <h1 className="text-[2.2rem] font-extrabold leading-none text-foreground tracking-tight">{profile?.full_name || displayUsername}</h1>
                <ChevronDown className="mt-1 h-5 w-5 text-foreground" />
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-destructive" />
              </div>
              <p className="mt-1 text-lg text-foreground">{displayUsername}</p>

              {profile?.bio && (
                <p className="mt-4 max-w-[320px] whitespace-pre-line text-[15px] leading-7 text-foreground">{profile.bio}</p>
              )}

              {displayLocation && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {displayLocation}
                </div>
              )}

              {!!tradingProfile?.markets?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tradingProfile.markets.slice(0, 3).map((market) => (
                    <span key={market} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                      {market}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-1">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-[84px] w-[84px] rounded-full object-cover" />
              ) : (
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-2xl font-black text-primary-foreground">
                  {getInitials()}
                </div>
              )}
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 px-5 mt-6">
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-lg font-black text-foreground">{partnerCount}</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Partners</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-destructive" />
              <span className="text-lg font-black text-foreground">{streak}</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Streak</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <span className="text-lg font-black text-foreground">{winRate}%</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Win rate</span>
          </div>
        </div>

        {/* Prompt Cards */}
        {((profile?.chart_prompts?.length ?? 0) > 0 || (profile?.off_chart_prompts?.length ?? 0) > 0) && (
          <div className="px-5 mt-4 space-y-2.5">
            {(profile?.chart_prompts?.length ?? 0) > 0 && (
              <div className="bg-card border border-primary/15 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">📊 My Charts</div>
                <div className="flex flex-wrap gap-2">
                  {profile!.chart_prompts.map((p: string) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {(profile?.off_chart_prompts?.length ?? 0) > 0 && (
              <div className="bg-card border border-accent/15 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-2.5 flex items-center gap-1.5">🎯 Off The Charts</div>
                <div className="flex flex-wrap gap-2">
                  {profile!.off_chart_prompts.map((p: string) => (
                    <span key={p} className="px-3 py-1.5 rounded-full bg-accent/10 text-xs font-semibold text-accent">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 px-5 mt-5">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 rounded-2xl border border-border bg-secondary py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
          >
            Edit profile
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex border-b border-border px-5">
          {[
            { label: "Threads", icon: <Edit className="w-4 h-4" /> },
            { label: "Replies", icon: <MessageCircle className="w-4 h-4" /> },
            { label: "Media", icon: <ImageIcon className="w-4 h-4" /> },
            { label: "Reposts", icon: <Repeat2 className="w-4 h-4" /> },
          ].map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={cn(
                "relative flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors",
                activeTab === i ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === i && <div className="absolute bottom-0 left-[15%] right-[15%] h-[2px] rounded-full bg-gradient-to-r from-primary to-accent" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 ? (
          posts.length > 0 ? (
            <div>
              {posts.map((post: any) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="block w-full border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 overflow-hidden rounded-full bg-muted">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">{getInitials()}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{displayUsername}</span>
                        <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      {(post.content || post.caption) && (
                        <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-foreground">{post.content || post.caption}</p>
                      )}
                      {!!post.tags?.length && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {post.tags.map((tag: string) => (
                            <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">#{tag}</span>
                          ))}
                        </div>
                      )}
                      {!!(post.media_urls?.length || post.media_url || post.image_url) && (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted">
                          <img src={post.media_urls?.[0] || post.media_url || post.image_url} alt="Post media" className="max-h-[320px] w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mb-4">
                <Camera className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-base font-extrabold text-foreground mb-1">Share Photos</p>
              <p className="text-xs text-muted-foreground mb-5 max-w-[240px]">When you share photos, they will appear on your profile.</p>
              <button onClick={() => setShowCreatePost(true)} className="text-sm font-bold text-primary hover:text-primary/80">
                Share your first photo
              </button>
            </div>
          )
        ) : activeTab === 1 || activeTab === 3 ? (
          <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-muted-foreground/30">
              {activeTab === 1 ? <MessageCircle className="h-7 w-7 text-muted-foreground/50" /> : <Repeat2 className="h-7 w-7 text-muted-foreground/50" />}
            </div>
            <p className="mb-1 text-base font-extrabold text-foreground">Nothing here yet</p>
            <p className="max-w-[240px] text-xs text-muted-foreground">This section will fill out as activity grows.</p>
          </div>
        ) : activeTab === 2 ? (
          posts.filter((post: any) => post.media_urls?.length || post.media_url || post.image_url).length > 0 ? (
            <div className="grid grid-cols-3 gap-[2px] mt-[2px]">
              {posts.filter((post: any) => post.media_urls?.length || post.media_url || post.image_url).map((post: any) => (
                <button key={post.id} onClick={() => setSelectedPost(post)} className="aspect-square overflow-hidden bg-muted">
                  <img src={post.media_urls?.[0] || post.media_url || post.image_url} alt="Post media" className="h-full w-full object-cover transition-opacity hover:opacity-80" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="mb-1 text-base font-extrabold text-foreground">No media yet</p>
              <p className="max-w-[240px] text-xs text-muted-foreground">Photos you post will show up here.</p>
            </div>
          )
        ) : (
          hasAnyDetails ? (
            <div className="px-5 py-4 space-y-3 pb-8">
              {(tradingProfile?.experience_level || (tradingProfile?.primary_goal && tradingProfile.primary_goal.length > 0)) && (
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">🎯 Overview</div>
                  {tradingProfile?.experience_level && (
                    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">Experience</span>
                      <span className="text-xs font-bold text-foreground">{tradingProfile.experience_level}</span>
                    </div>
                  )}
                  {tradingProfile?.primary_goal && tradingProfile.primary_goal.length > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-muted-foreground">Goals</span>
                      <span className="text-xs font-bold text-foreground text-right max-w-[60%]">{tradingProfile.primary_goal.join(", ")}</span>
                    </div>
                  )}
                </div>
              )}

              {detailSections.map(section => {
                if (!section.data || section.data.length === 0) return null;
                return (
                  <div key={section.title} className="bg-card border border-border rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">{section.icon} {section.title}</div>
                    <div className="flex flex-wrap gap-2">
                      {section.data.map(d => (
                        <span key={d} className="px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-foreground">{d}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mb-4">
                <Settings className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-base font-extrabold text-foreground mb-1">Trading Details</p>
              <p className="text-xs text-muted-foreground mb-5 max-w-[240px]">Complete onboarding to show your trading identity.</p>
              <button onClick={() => navigate("/onboarding")} className="text-sm font-bold text-primary hover:text-primary/80">
                Complete setup
              </button>
            </div>
          )
        )}
      </div>

      <CreatePostModal open={showCreatePost} onClose={() => setShowCreatePost(false)} onCreated={async () => {
        const { data } = await supabase.from("posts" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
        setPosts(data || []);
      }} />
      <PostDetailModal open={!!selectedPost} onClose={() => setSelectedPost(null)} post={selectedPost} myId={userId} onDeleted={async () => {
        const { data } = await supabase.from("posts" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
        setPosts(data || []);
      }} />
    </AppLayout>
  );
};

const EditField = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div>
    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
      placeholder={placeholder}
    />
  </div>
);

export default Profile;
