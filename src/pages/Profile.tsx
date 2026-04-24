import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Flame, Globe, LogOut, Moon, Pencil, SlidersHorizontal, Sun } from "lucide-react";
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
  instruments: string[];
  sessions: string[];
  trade_times: string[];
  trading_style: string[];
  strategies: string[];
  timeframes: string[];
  experience_level: string | null;
  primary_goal: string[];
  struggles: string[];
  frequency: string[];
  journaling: string[];
  trading_plan: string[];
  loss_response: string[];
  looking_for_gender: string | null;
  connection_reach: string | null;
  connection_types: string[];
  connect_frequency: string[];
  match_priorities: string[];
}

interface JournalEntry {
  id: string;
  created_at: string;
  mood: string | null;
  result: string | null;
  pnl_pips: number | null;
  market_pair: string | null;
  session: string | null;
  notes: string | null;
  tags: string[] | null;
  share_setting: string | null;
  account_type: string | null;
}

interface ProfilePostItem {
  id: string;
  user_id: string;
  content?: string | null;
  caption?: string | null;
  media_url?: string | null;
  media_urls?: string[] | null;
  image_url?: string | null;
  tags?: string[] | null;
  created_at: string;
  username: string;
  avatar_url: string | null;
  kind: "post" | "repost" | "saved";
  originalUsername?: string;
  originalAvatarUrl?: string | null;
  originalCreatedAt?: string;
}

const Profile = () => {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tradingProfile, setTradingProfile] = useState<TradingProfileData | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
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
  const formInitialized = useRef(false);
  const tradingDraftInitialized = useRef(false);
  const [profileDraft, setProfileDraft] = useState<ProfileEditorDraft>({ gender: "", city: "", state: "", country: "", hobbies: [], chart_prompts: [], off_chart_prompts: [] });
  const [tradingDraft, setTradingDraft] = useState<TradingEditorDraft>({ markets: [], instruments: [], sessions: [], trade_times: [], trading_style: [], strategies: [], timeframes: [], frequency: [], experience_level: "", primary_goal: [], loss_response: [], struggles: [], journaling: [], trading_plan: [], looking_for_gender: "", connection_reach: "", connect_frequency: [], match_priorities: [] });

  const [posts, setPosts] = useState<ProfilePostItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<ProfilePostItem[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<ProfilePostItem | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const loadProfileCollections = async (uid: string, ownUsername?: string | null) => {
    const [{ data: ownPosts }, { data: repostRows }, { data: savedRows }, { data: ownProfile }] = await Promise.all([
      supabase.from("posts").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("post_reposts" as any).select("post_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("saved_posts" as any).select("post_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("profiles").select("username, avatar_url").eq("id", uid).maybeSingle(),
    ]);

    const referencedIds = [...new Set([...(repostRows || []).map((row: any) => row.post_id), ...(savedRows || []).map((row: any) => row.post_id)])];
    const { data: referencedPosts } = referencedIds.length > 0
      ? await supabase.from("posts").select("*").in("id", referencedIds)
      : { data: [] as any[] };

    const authorIds = [...new Set([...(ownPosts || []).map((post: any) => post.user_id), ...(referencedPosts || []).map((post: any) => post.user_id)])];
    const { data: authorProfiles } = authorIds.length > 0
      ? await supabase.from("profiles").select("id, username, avatar_url").in("id", authorIds)
      : { data: [] as any[] };

    const authorMap = new Map((authorProfiles || []).map((entry: any) => [entry.id, entry]));
    const referencedMap = new Map((referencedPosts || []).map((entry: any) => [entry.id, entry]));
    const myUsername = ownUsername || ownProfile?.username || profile?.username || "username";

    const ownItems: ProfilePostItem[] = (ownPosts || []).map((post: any) => ({
      ...post,
      username: `@${myUsername}`,
      avatar_url: ownProfile?.avatar_url || profile?.avatar_url || null,
      kind: "post",
    }));

    const repostItems: ProfilePostItem[] = (repostRows || []).map((row: any) => {
      const original = referencedMap.get(row.post_id);
      const author = original ? authorMap.get(original.user_id) : null;
      return original ? {
        ...original,
        created_at: row.created_at,
        username: `@${myUsername}`,
        avatar_url: ownProfile?.avatar_url || profile?.avatar_url || null,
        kind: "repost",
        originalUsername: author?.username ? `@${author.username}` : "@trader",
        originalAvatarUrl: author?.avatar_url || null,
        originalCreatedAt: original.created_at,
      } : null;
    }).filter(Boolean) as ProfilePostItem[];

    const savedItems: ProfilePostItem[] = (savedRows || []).map((row: any) => {
      const original = referencedMap.get(row.post_id);
      const author = original ? authorMap.get(original.user_id) : null;
      return original ? {
        ...original,
        created_at: row.created_at,
        username: author?.username ? `@${author.username}` : "@trader",
        avatar_url: author?.avatar_url || null,
        kind: "saved",
        originalUsername: author?.username ? `@${author.username}` : "@trader",
        originalAvatarUrl: author?.avatar_url || null,
        originalCreatedAt: original.created_at,
      } : null;
    }).filter(Boolean) as ProfilePostItem[];

    setPosts([...ownItems, ...repostItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setSavedPosts(savedItems);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [{ data: pData }, { data: tData }, { data: entries }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("journal_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);

      if (pData) {
        setProfile(pData as ProfileData);
        // Only seed form fields from DB once. Never clobber what the user is typing.
        if (!formInitialized.current) {
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
          formInitialized.current = true;
        }
      }

      if (tData) {
        setTradingProfile({
          markets: tData.markets || [],
          instruments: (tData as any).instruments || [],
          sessions: tData.sessions || [],
          trade_times: (tData as any).trade_times || [],
          trading_style: tData.trading_style || [],
          strategies: tData.strategies || [],
          timeframes: tData.timeframes || [],
          frequency: tData.frequency || [],
          experience_level: tData.experience_level || null,
          primary_goal: tData.primary_goal || [],
          loss_response: typeof (tData as any).loss_response === "string" ? (tData as any).loss_response.split(", ").filter(Boolean) : [],
          struggles: tData.struggles || [],
          journaling: (tData as any).journaling || [],
          trading_plan: (tData as any).trading_plan || [],
          looking_for_gender: tData.looking_for_gender || null,
          connection_reach: tData.connection_reach || null,
          connection_types: (tData as any).connection_types || [],
          connect_frequency: (tData as any).connect_frequency || [],
          match_priorities: (tData as any).match_priorities || [],
        });

        // Seed editable draft only the first time so we don't clobber user input.
        if (!tradingDraftInitialized.current) {
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
          tradingDraftInitialized.current = true;
        }
      }

      await loadProfileCollections(user.id, pData?.username);
      setJournalEntries((entries as JournalEntry[]) || []);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const getInitials = () => {
    if (!profile?.full_name) return "?";
    return profile.full_name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast.error("Upload failed");
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
    setProfile((current) => (current ? { ...current, avatar_url: avatarUrl } : current));
    toast.success("Photo updated");
  };

  const refreshPosts = async () => {
    if (!userId) return;
    await loadProfileCollections(userId, profile?.username);
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

    if (profileError || tradingError) {
      toast.error("Failed to save");
      return;
    }

    setProfile((current) => current ? {
      ...current,
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
    } : current);

    setTradingProfile((current) => current ? {
      ...current,
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
      loss_response: tradingDraft.loss_response,
      struggles: tradingDraft.struggles,
      journaling: tradingDraft.journaling,
      trading_plan: tradingDraft.trading_plan,
      looking_for_gender: tradingDraft.looking_for_gender || null,
      connection_reach: tradingDraft.connection_reach || null,
      connect_frequency: tradingDraft.connect_frequency,
      match_priorities: tradingDraft.match_priorities,
    } : current);

    setEditing(false);
    toast.success("Profile updated");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const displayName = profile?.full_name || "Your profile";
  const displayUsername = profile?.username ? `@${profile.username}` : "@username";

  const detailSections = [
    { title: "Markets", items: tradingProfile?.markets || [] },
    { title: "Instruments", items: tradingProfile?.instruments || [] },
    { title: "Sessions", items: tradingProfile?.sessions || [] },
    { title: "Trade Times", items: tradingProfile?.trade_times || [] },
    { title: "Trading Style", items: tradingProfile?.trading_style || [] },
    { title: "Strategies", items: tradingProfile?.strategies || [] },
    { title: "Timeframes", items: tradingProfile?.timeframes || [] },
    { title: "Frequency", items: tradingProfile?.frequency || [] },
    { title: "Primary Goals", items: tradingProfile?.primary_goal || [] },
    { title: "Loss Response", items: tradingProfile?.loss_response || [] },
    { title: "Struggles", items: tradingProfile?.struggles || [] },
    { title: "Journaling", items: tradingProfile?.journaling || [] },
    { title: "Trading Plan", items: tradingProfile?.trading_plan || [] },
    { title: "Match Priorities", items: tradingProfile?.match_priorities || [] },
    { title: "Interests", items: profile?.hobbies || [] },
    { title: "Chart Prompts", items: profile?.chart_prompts || [] },
    { title: "Off Chart", items: profile?.off_chart_prompts || [] },
  ].filter((section) => section.items.length > 0);

  const profileFacts = [
    { label: "Experience", value: tradingProfile?.experience_level || null },
    { label: "Gender", value: profile?.gender || null },
    { label: "Looking For", value: tradingProfile?.looking_for_gender || null },
    { label: "Connection Reach", value: tradingProfile?.connection_reach || null },
  ].filter((item) => item.value);

  if (guardLoading || loading || !onboardingComplete) {
    return (
      <AppLayout>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (editing) {
    return (
      <AppLayout>
        <div className="flex-1 overflow-y-auto pb-8">
          <div className="flex items-center justify-between border-b border-border px-5 pb-3 pt-4">
            <button onClick={() => setEditing(false)} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Cancel</button>
            <span className="text-base font-extrabold text-foreground">Edit Profile</span>
            <button onClick={handleSaveProfile} disabled={saving} className="text-sm font-bold text-primary transition-colors hover:text-primary/80">{saving ? "Saving..." : "Done"}</button>
          </div>

          <div className="flex justify-center py-5">
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => avatarInputRef.current?.click()} className="relative group">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile photo" className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-black text-muted-foreground ring-2 ring-border">{getInitials()}</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-foreground" />
                </div>
              </button>
              <button onClick={() => avatarInputRef.current?.click()} className="text-xs font-bold text-primary">Change photo</button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          <div className="space-y-4 px-5">
            <EditField label="Full Name" value={editName} onChange={setEditName} placeholder="Your full name" />
            <EditField label="Username" value={editUsername} onChange={setEditUsername} placeholder="username" />
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bio</label>
              <Textarea value={editBio} onChange={(event) => setEditBio(event.target.value)} className="min-h-[88px] resize-none rounded-xl border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:border-primary" placeholder="Tell traders about yourself..." maxLength={150} />
              <div className="mt-1 text-right text-[10px] text-muted-foreground">{editBio.length}/150</div>
            </div>
            <TradingProfileEditor profileDraft={profileDraft} setProfileDraft={setProfileDraft} tradingDraft={tradingDraft} setTradingDraft={setTradingDraft} />

            <div className="pt-2">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Appearance</label>
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {isDark ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm text-foreground">Dark mode</span>
                </div>
                <button
                  onClick={() => {
                    const next = !isDark;
                    setIsDark(next);
                    document.documentElement.classList.toggle("dark", next);
                    localStorage.setItem("theme", next ? "dark" : "light");
                  }}
                  className={cn("relative h-[22px] w-10 rounded-full transition-colors", isDark ? "bg-primary" : "bg-muted")}
                >
                  <div className={cn("absolute top-[2px] h-[18px] w-[18px] rounded-full bg-background shadow transition-transform", isDark ? "left-[20px]" : "left-[2px]")} />
                </button>
              </div>
            </div>

            <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Top bar: wordmark + settings */}
        <div className="relative flex items-center justify-center px-5 pt-5">
          <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">
            Traders<span className="text-foreground">World</span>
          </h1>
          <button
            onClick={() => setEditing(true)}
            className="absolute right-5 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            aria-label="Settings"
          >
            <SlidersHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Hero: streak | avatar | location */}
        <div className="grid grid-cols-3 items-center gap-3 px-5 pt-6">
          {/* Streak */}
          <div className="flex flex-col items-center">
            <Flame className="h-7 w-7 fill-destructive text-destructive" />
            <p className="mt-1.5 text-[22px] font-extrabold leading-none text-foreground">{journalEntries.length || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Streak</p>
          </div>

          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <button onClick={() => avatarInputRef.current?.click()} className="block">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile photo" className="h-[110px] w-[110px] rounded-full object-cover ring-2 ring-primary/60" />
                ) : (
                  <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-secondary text-2xl font-black text-foreground ring-2 ring-primary/60">{getInitials()}</div>
                )}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="absolute -bottom-1 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
              <Globe className="h-5 w-5 text-primary" strokeWidth={2} />
            </div>
            <p className="mt-1.5 text-[15px] font-extrabold leading-none text-foreground text-center">
              {profile?.city || profile?.country
                ? `${profile?.state || profile?.city || ""}${profile?.country ? `, ${profile.country}` : ""}`.replace(/^,\s*/, "")
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Location</p>
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

        {/* Name + bio */}
        <div className="mt-6 px-5 text-center">
          <h2 className="text-[22px] font-extrabold leading-tight text-foreground">{displayName}</h2>
          {profile?.bio ? (
            <p className="mx-auto mt-2 max-w-[320px] whitespace-pre-line text-[14px] leading-6 text-muted-foreground">{profile.bio}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Add a bio so traders know how you move.</p>
          )}
        </div>

        {/* Posts / Details / Journal pill tabs */}
        <div className="mt-6 flex justify-center gap-2.5 px-5">
          {["Posts", "Details", "Journal"].map((tab, index) => (
            <button
              key={tab}
              onClick={() => setActiveTab(index)}
              className={cn(
                "flex-1 max-w-[120px] rounded-full px-5 py-2.5 text-sm font-bold transition-all",
                activeTab === index
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-transparent text-foreground hover:bg-muted"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-2" />

        {activeTab === 0 ? (
          <PostList
            posts={posts}
            savedPosts={savedPosts}
            avatarUrl={profile?.avatar_url}
            initials={getInitials()}
            username={displayUsername}
            onOpenPost={setSelectedPost}
            onCreate={() => setShowCreatePost(true)}
          />
        ) : activeTab === 1 ? (
          <DetailsGrid
            profile={profile}
            tradingProfile={tradingProfile}
          />
        ) : (
          <JournalList entries={journalEntries} onOpenLog={() => navigate("/trading-log")} />
        )}
      </div>

      <CreatePostModal
        open={showCreatePost}
        onClose={() => {
          setShowCreatePost(false);
          setEditingPost(null);
        }}
        onCreated={() => {
          setShowCreatePost(false);
          setEditingPost(null);
          refreshPosts();
        }}
        initialPost={editingPost}
      />
      <PostDetailModal
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        myId={userId}
        onDeleted={refreshPosts}
        onEdit={(post) => {
          setSelectedPost(null);
          setEditingPost(post as ProfilePostItem);
          setShowCreatePost(true);
        }}
      />
    </AppLayout>
  );
};

const PostList = ({
  posts,
  savedPosts,
  avatarUrl,
  initials,
  username,
  onOpenPost,
  onCreate,
}: {
  posts: ProfilePostItem[];
  savedPosts: ProfilePostItem[];
  avatarUrl: string | null | undefined;
  initials: string;
  username: string;
  onOpenPost: (post: any) => void;
  onCreate: () => void;
}) => {
  if (posts.length === 0 && savedPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary">
          <Camera className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-base font-bold text-foreground">No posts yet</p>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">Your posts will show up here in a simple timeline.</p>
        <button onClick={onCreate} className="mt-5 text-sm font-bold text-primary transition-colors hover:text-primary/80">Create your first post</button>
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => {
        const media = post.media_urls?.[0] || post.media_url || post.image_url;
        return (
          <button key={post.id} onClick={() => onOpenPost(post)} className="block w-full border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted/20">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-secondary">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile photo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">{initials}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{post.username || username}</span>
                  <span className="text-[11px] text-muted-foreground">{formatProfileDate(post.created_at)}</span>
                </div>
                {post.kind === "repost" && (
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">Reposted from {post.originalUsername}</p>
                )}
                {(post.content || post.caption) && <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-foreground">{post.content || post.caption}</p>}
                {!!post.tags?.length && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-foreground">#{tag}</span>
                    ))}
                  </div>
                )}
                {media && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-secondary">
                    <img src={media} alt="Post media" className="max-h-[340px] w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {savedPosts.length > 0 && (
        <div className="px-5 py-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Saved</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {savedPosts.map((post, index) => {
              const media = post.media_urls?.[0] || post.media_url || post.image_url;
              return (
                <button
                  key={`saved-${post.id}`}
                  onClick={() => onOpenPost(post)}
                  className={cn(
                    "block w-full px-4 py-4 text-left transition-colors hover:bg-muted/20",
                    index !== savedPosts.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
                      {post.avatar_url ? (
                        <img src={post.avatar_url} alt="Saved post author" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">{(post.originalUsername || post.username || "@").slice(1, 2).toUpperCase()}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{post.originalUsername || post.username}</span>
                        <span className="text-[11px] text-muted-foreground">Saved {formatProfileDate(post.created_at)}</span>
                      </div>
                      {(post.content || post.caption) && <p className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-foreground">{post.content || post.caption}</p>}
                      {media && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-secondary">
                          <img src={media} alt="Saved post media" className="max-h-[280px] w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const JournalList = ({ entries, onOpenLog }: { entries: JournalEntry[]; onOpenLog: () => void }) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <p className="text-base font-bold text-foreground">No journal entries yet</p>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">Log your sessions and they’ll show up here.</p>
        <button onClick={onOpenLog} className="mt-5 text-sm font-bold text-primary transition-colors hover:text-primary/80">Open trading log</button>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-5 py-4">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {entry.result && <span className="text-sm font-bold text-foreground">{entry.result}</span>}
                {entry.market_pair && <span className="text-xs text-muted-foreground">{entry.market_pair}</span>}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{formatProfileDate(entry.created_at)}</p>
            </div>
            {typeof entry.pnl_pips === "number" && (
              <span className="text-sm font-bold text-foreground">{entry.pnl_pips > 0 ? "+" : ""}{entry.pnl_pips} pips</span>
            )}
          </div>

          {(entry.mood || entry.session || entry.account_type) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.mood && <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground">{entry.mood}</span>}
              {entry.session && <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground">{entry.session}</span>}
              {entry.account_type && <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground">{entry.account_type}</span>}
            </div>
          )}

          {entry.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{entry.notes}</p>}

          {!!entry.tags?.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const DetailCard = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">{item}</span>
      ))}
    </div>
  </div>
);

const DetailsGrid = ({
  profile,
  tradingProfile,
}: {
  profile: ProfileData | null;
  tradingProfile: TradingProfileData | null;
}) => {
  const first = (arr?: string[] | null) => (arr && arr.length > 0 ? arr[0] : null);

  const items: { value: string; label: string }[] = [
    { value: first(tradingProfile?.sessions) || "", label: "Session" },
    { value: first(tradingProfile?.trading_style) || "", label: "Trading Style" },
    { value: first(tradingProfile?.strategies) || "", label: "Strategy" },
    { value: first(profile?.chart_prompts) || "", label: "Charts" },
    { value: first(profile?.hobbies) || "", label: "Interests" },
    { value: first(profile?.off_chart_prompts) || "", label: "Off Chart" },
    { value: first(tradingProfile?.timeframes) || "", label: "Timeframe" },
    { value: tradingProfile?.experience_level || "", label: "Experience level" },
    { value: first(tradingProfile?.frequency) || "", label: "How Often" },
    { value: first(tradingProfile?.markets) || "", label: "Markets" },
    { value: first(tradingProfile?.instruments) || "", label: "Instruments" },
    { value: first(tradingProfile?.trade_times) || "", label: "Trade Times" },
    { value: first(tradingProfile?.primary_goal) || "", label: "Primary Goal" },
    { value: first(tradingProfile?.struggles) || "", label: "Struggles" },
    { value: first(tradingProfile?.journaling) || "", label: "Journaling" },
    { value: first(tradingProfile?.trading_plan) || "", label: "Trading Plan" },
    { value: first(tradingProfile?.loss_response as any) || "", label: "Loss Response" },
    { value: first(tradingProfile?.match_priorities) || "", label: "Match Priority" },
    { value: tradingProfile?.looking_for_gender || "", label: "Looking For" },
    { value: profile?.gender || "", label: "Gender" },
  ].filter((i) => !!i.value);

  const reach = (tradingProfile?.connection_reach || "").toLowerCase();
  const reachIndex = reach === "local" ? 0 : reach === "global" ? 1 : reach === "both" ? 2 : -1;

  if (items.length === 0 && reachIndex < 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <p className="text-base font-bold text-foreground">No details yet</p>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">Complete your onboarding info to fill this section out.</p>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-10 space-y-8">
      <div className="grid grid-cols-3 gap-y-7 gap-x-4">
        {items.map((it, i) => (
          <div key={`${it.label}-${i}`} className="text-left">
            <p className="text-[15px] font-extrabold leading-tight text-primary">{it.value}</p>
            <p className="mt-1 text-[12px] text-foreground">{it.label}</p>
          </div>
        ))}
      </div>

      {reachIndex >= 0 && (
        <div>
          <p className="text-[15px] font-semibold text-foreground">Connection Reach</p>
          <div className="mt-5 mb-3 h-[6px] w-full rounded-full bg-muted relative">
            <div
              className="absolute top-0 left-0 h-[6px] rounded-full bg-primary"
              style={{ width: reachIndex === 0 ? "0%" : reachIndex === 1 ? "50%" : "100%" }}
            />
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "absolute -top-[5px] h-4 w-4 rounded-full border-2",
                  i <= reachIndex ? "bg-primary border-primary" : "bg-background border-foreground/40"
                )}
                style={{ left: i === 0 ? "0%" : i === 1 ? "calc(50% - 8px)" : "calc(100% - 16px)" }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[12px]">
            <span className={cn("font-semibold", reachIndex === 0 ? "text-primary" : "text-muted-foreground")}>Local</span>
            <span className={cn("font-semibold", reachIndex === 1 ? "text-primary" : "text-muted-foreground")}>Global</span>
            <span className={cn("font-semibold", reachIndex === 2 ? "text-primary" : "text-muted-foreground")}>Both</span>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-2xl border border-border bg-card py-4 text-center">
    <p className="text-[26px] font-extrabold leading-none text-primary">{value}</p>
    <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
  </div>
);

const EditField = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) => (
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

const formatProfileDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default Profile;
