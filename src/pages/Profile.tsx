import { useEffect, useRef, useState } from "react";
import { useSessionCache } from "@/hooks/use-session-cache";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Camera, LogOut, MapPin, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { toast } from "sonner";
import TradingProfileEditor, { type ProfileEditorDraft, type TradingEditorDraft } from "@/components/profile/TradingProfileEditor";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import TraderDetailsPanel from "@/components/profile/TraderDetailsPanel";
import ProfileJournalCards, { type ProfileJournalEntry } from "@/components/profile/ProfileJournalCards";

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
  birth_year?: number | null;
  created_at?: string | null;
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
  pnl_unit?: string | null;
}

const Profile = () => {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile, hadProfileCache] = useSessionCache<ProfileData | null>("profile:me:profile", null);
  const [tradingProfile, setTradingProfile] = useSessionCache<TradingProfileData | null>("profile:me:trading", null);
  const [journalEntries, setJournalEntries] = useSessionCache<JournalEntry[]>("profile:me:journal", []);
  const [loading, setLoading] = useState(!hadProfileCache);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
        supabase.from("profiles").select("id, username, full_name, avatar_url, bio, birth_year, gender, location, city, state, country, hobbies, off_chart_prompts, chart_prompts, profile_visibility, onboarding_completed, tour_completed, username_changes_count, notify_email, notify_messages, notify_new_matches, notify_partner_activity, created_at, updated_at").eq("id", user.id).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("journal_entries").select("*").eq("user_id", user.id).eq("hidden_from_journal", false).order("created_at", { ascending: false }).limit(50),
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
    // Open the crop dialog with the chosen file before uploading
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be picked again later
    event.target.value = "";
  };

  const uploadCroppedAvatar = async (blob: Blob) => {
    if (!userId) return;
    const filePath = `${userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) {
      toast.error("Upload failed");
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
    setProfile((current) => (current ? { ...current, avatar_url: avatarUrl } : current));
    setCropSrc(null);
    toast.success("Photo updated");
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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your account permanently?\n\nThis removes your profile, posts, messages, journal entries, and connections. This cannot be undone."
    );
    if (!confirmed) return;
    const phrase = window.prompt('Type DELETE to confirm.');
    if (phrase !== "DELETE") {
      toast.error("Account deletion cancelled.");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate("/");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't delete account. Please email support@tradersworld.app.");
    }
  };

  const displayName = profile?.full_name || "Your profile";
  const displayUsername = profile?.username ? `@${profile.username}` : "@username";

  // Profile completeness: short list of high-impact fields others see
  const completenessChecks = [
    { key: "avatar", label: "Profile photo", done: !!profile?.avatar_url },
    { key: "bio", label: "Bio", done: !!(profile?.bio && profile.bio.trim().length > 0) },
    { key: "location", label: "Location (city, state, country)", done: !!(profile?.city || profile?.state || profile?.country) },
    { key: "markets", label: "Markets", done: (tradingProfile?.markets?.length || 0) > 0 },
    { key: "trading_style", label: "Trading style", done: (tradingProfile?.trading_style?.length || 0) > 0 },
    { key: "experience", label: "Experience level", done: !!tradingProfile?.experience_level },
    { key: "interests", label: "Interests / hobbies", done: (profile?.hobbies?.length || 0) > 0 },
  ];
  const completedCount = completenessChecks.filter((c) => c.done).length;
  const completenessPct = Math.round((completedCount / completenessChecks.length) * 100);
  const missingFields = completenessChecks.filter((c) => !c.done);

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
          <div className="flex items-center justify-between border-b border-border px-5 pb-3 pt-safe-4">
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

            <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              Log out
            </button>

            <div className="pt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Danger zone</p>
              <button
                onClick={handleDeleteAccount}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive bg-destructive/10 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
              <p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">
                Permanent and immediate. Removes your profile, posts, messages, and all data.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout lockHeight>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {/* Locked header — wordmark, hero, bio, completeness, tabs */}
        <div className="shrink-0 bg-background">
        {/* Top bar: wordmark + settings */}
        <div
          className="relative flex items-center justify-center px-5"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
        >
          <h1 className="text-[22px] font-extrabold text-foreground">
            Traders<span className="text-foreground">World</span>
          </h1>
          <div className="absolute right-5 flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              aria-label="Edit profile"
            >
              <Pencil className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              aria-label="Settings"
            >
              <SlidersHorizontal className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Hero: avatar on the left, name + bio on the right */}
        <div className="flex items-start gap-4 px-5 pt-6">
          <div className="relative shrink-0">
            <button data-tour="profile-avatar" onClick={() => avatarInputRef.current?.click()} className="block">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile photo" className="h-[104px] w-[104px] rounded-full object-cover ring-2 ring-primary/60" />
              ) : (
                <div className="flex h-[104px] w-[104px] items-center justify-center rounded-full bg-secondary text-2xl font-black text-foreground ring-2 ring-primary/60">{getInitials()}</div>
              )}
            </button>
          </div>

          {/* Name + bio (right of avatar) */}
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-[20px] font-extrabold leading-tight text-foreground truncate">{displayName}{profile?.birth_year ? ` · ${new Date().getFullYear() - profile.birth_year}` : ""}</h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{displayUsername}</p>
            {(() => {
              const market = tradingProfile?.markets?.[0];
              const style = tradingProfile?.trading_style?.[0];
              const exp = tradingProfile?.experience_level;
              const chips = [market, style, exp].filter(Boolean) as string[];
              if (chips.length === 0) return null;
              return (
                <div className="mt-1 text-[13px] font-semibold text-primary truncate">
                  {chips.join(" · ")}
                </div>
              );
            })()}
            {/* Meta row: Location · Joined date - directly under chips */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              {(profile?.city || profile?.state || profile?.country) && (
                <span className="inline-flex items-center gap-1 min-w-0">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {[profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ")}
                  </span>
                </span>
              )}
              {profile?.created_at && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

        {/* Bio - full width below meta */}
        <div className="mt-3 px-5">
          {profile?.bio ? (
            <p className="whitespace-pre-line text-[13px] leading-5 text-muted-foreground">{profile.bio}</p>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-left text-[13px] text-muted-foreground italic hover:text-foreground transition-colors"
            >
              Add a bio so traders know how you move.
            </button>
          )}
        </div>

        {/* Profile completeness */}
        {completenessPct < 100 && (
          <div className="mt-4 px-5">
            <button
              onClick={() => setEditing(true)}
              className="w-full rounded-2xl border border-border bg-card/60 p-3 text-left transition-colors hover:bg-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-foreground">Profile completeness</span>
                <span className="text-[12px] font-semibold text-primary">{completenessPct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completenessPct}%` }} />
              </div>
              {missingFields.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {missingFields.slice(0, 5).map((f) => (
                    <span key={f.key} className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                      + {f.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-wide text-primary">Tap to complete</div>
            </button>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 border-y border-border">
          {["Details", "Journal"].map((label, index) => (
            <button
              key={label}
              onClick={() => setActiveTab(index)}
              aria-label={label}
              title={label}
              className={cn(
                "relative flex items-center justify-center py-3 text-xs font-bold transition-colors",
                activeTab === index ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {activeTab === index && <span className="absolute -bottom-px left-5 right-5 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
        </div>

        {/* Scrollable tab content — only this region scrolls */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-2"
          style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
        >
        {activeTab === 0 ? (
          <TraderDetailsPanel profile={profile as any} tradingProfile={tradingProfile as any} />
        ) : (
          <ProfileJournalCards
            entries={journalEntries as ProfileJournalEntry[]}
            emptyDescription="Log your sessions and they’ll show up here."
            onTogglePrivacy={async (entry) => {
              const next = entry.share_setting === "private" ? "partners" : "private";
              const { error } = await supabase.from("journal_entries").update({ share_setting: next }).eq("id", entry.id);
              if (error) { toast.error("Couldn't update privacy"); return; }
              toast.success(next === "private" ? "Marked private" : "Shared with partners");
              if (!userId) return;
              const { data } = await supabase
                .from("journal_entries")
                .select("*")
                .eq("user_id", userId)
                .eq("hidden_from_journal", false)
                .order("created_at", { ascending: false })
                .limit(50);
              setJournalEntries((data as JournalEntry[]) || []);
            }}
            onHide={async (entry) => {
              if (!confirm("Remove this entry from your profile journal? It will remain in your Journal.")) return;
              const { error } = await supabase.from("journal_entries").update({ hidden_from_journal: true } as any).eq("id", entry.id);
              if (error) { toast.error("Couldn't remove entry"); return; }
              setJournalEntries((current) => current.filter((item) => item.id !== entry.id));
              toast.success("Removed from profile journal");
            }}
          />
        )}
      </div>
      </div>

      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onConfirm={uploadCroppedAvatar}
      />
    </AppLayout>
  );
};

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

export default Profile;
