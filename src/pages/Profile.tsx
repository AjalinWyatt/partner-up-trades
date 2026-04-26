import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Camera, FileText, Grid3x3, Heart, Info, Lock, LogOut, MapPin, MessageCircle, MoreVertical, Moon, NotebookPen, Pencil, Plus, Send, SlidersHorizontal, Sun, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/AppLayout";
import CreatePostModal from "@/components/CreatePostModal";
import PostDetailModal from "@/components/PostDetailModal";
import CreatePhotoAlbumModal from "@/components/CreatePhotoAlbumModal";
import SharePostSheet from "@/components/SharePostSheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { toast } from "sonner";
import TradingProfileEditor, { type ProfileEditorDraft, type TradingEditorDraft } from "@/components/profile/TradingProfileEditor";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import DetailCardsGrid from "@/components/profile/DetailCardsGrid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
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

  const [posts, setPosts] = useState<ProfilePostItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<ProfilePostItem[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreatePhoto, setShowCreatePhoto] = useState(false);
  const [editingPost, setEditingPost] = useState<ProfilePostItem | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [postToShare, setPostToShare] = useState<any>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const togglePostLike = async (postId: string) => {
    if (!userId) return;
    const target = posts.find((p) => p.id === postId);
    if (!target) return;
    const isLiked = !!target.liked;
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, liked: !isLiked, likeCount: (p.likeCount || 0) + (isLiked ? -1 : 1) } : p));
    if (isLiked) {
      await supabase.from("feed_likes").delete().eq("user_id", userId).eq("entry_id", postId);
    } else {
      await supabase.from("feed_likes").insert({ user_id: userId, entry_id: postId });
    }
  };

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

    // Aggregate likes/comments for all visible posts
    const allPostIds = [
      ...(ownPosts || []).map((p: any) => p.id),
      ...referencedIds,
    ];
    const [{ data: allLikes }, { data: myLikes }, { data: allComments }] = allPostIds.length > 0
      ? await Promise.all([
          supabase.from("feed_likes").select("entry_id").in("entry_id", allPostIds),
          supabase.from("feed_likes").select("entry_id").in("entry_id", allPostIds).eq("user_id", uid),
          supabase.from("feed_comments").select("entry_id").in("entry_id", allPostIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];
    const likeCounts = new Map<string, number>();
    (allLikes || []).forEach((l: any) => likeCounts.set(l.entry_id, (likeCounts.get(l.entry_id) || 0) + 1));
    const commentCounts = new Map<string, number>();
    (allComments || []).forEach((c: any) => commentCounts.set(c.entry_id, (commentCounts.get(c.entry_id) || 0) + 1));
    const mySet = new Set<string>((myLikes || []).map((l: any) => l.entry_id));
    const decorate = (p: any): ProfilePostItem => ({
      ...p,
      likeCount: likeCounts.get(p.id) || 0,
      commentCount: commentCounts.get(p.id) || 0,
      liked: mySet.has(p.id),
    });

    const ownItems: ProfilePostItem[] = (ownPosts || []).map((post: any) => decorate({
      ...post,
      username: `@${myUsername}`,
      avatar_url: ownProfile?.avatar_url || profile?.avatar_url || null,
      kind: "post",
    }));

    const repostItems: ProfilePostItem[] = (repostRows || []).map((row: any) => {
      const original = referencedMap.get(row.post_id);
      const author = original ? authorMap.get(original.user_id) : null;
      return original ? decorate({
        ...original,
        created_at: row.created_at,
        username: `@${myUsername}`,
        avatar_url: ownProfile?.avatar_url || profile?.avatar_url || null,
        kind: "repost",
        originalUsername: author?.username ? `@${author.username}` : "@trader",
        originalAvatarUrl: author?.avatar_url || null,
        originalCreatedAt: original.created_at,
      }) : null;
    }).filter(Boolean) as ProfilePostItem[];

    const savedItems: ProfilePostItem[] = (savedRows || []).map((row: any) => {
      const original = referencedMap.get(row.post_id);
      const author = original ? authorMap.get(original.user_id) : null;
      return original ? decorate({
        ...original,
        created_at: row.created_at,
        username: author?.username ? `@${author.username}` : "@trader",
        avatar_url: author?.avatar_url || null,
        kind: "saved",
        originalUsername: author?.username ? `@${author.username}` : "@trader",
        originalAvatarUrl: author?.avatar_url || null,
        originalCreatedAt: original.created_at,
      }) : null;
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
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Top bar: wordmark + settings */}
        <div className="relative flex items-center justify-center px-5 pt-5">
          <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">
            Traders<span className="text-foreground">World</span>
          </h1>
          <button
            onClick={() => navigate("/settings")}
            className="absolute right-5 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            aria-label="Settings"
          >
            <SlidersHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Hero: avatar on the left, name + bio on the right */}
        <div className="flex items-start gap-4 px-5 pt-6">
          <div className="relative shrink-0">
            <button onClick={() => avatarInputRef.current?.click()} className="block">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile photo" className="h-[104px] w-[104px] rounded-full object-cover ring-2 ring-primary/60" />
              ) : (
                <div className="flex h-[104px] w-[104px] items-center justify-center rounded-full bg-secondary text-2xl font-black text-foreground ring-2 ring-primary/60">{getInitials()}</div>
              )}
            </button>
            {/* Edit button - bottom center */}
            <button
              onClick={() => setEditing(true)}
              className="absolute -bottom-1 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
              aria-label="Edit profile"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>

          {/* Name + bio (right of avatar) */}
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-[20px] font-extrabold leading-tight text-foreground truncate">{displayName}</h2>
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
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

        {/* Meta row: Location · Joined date */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 text-[12px] text-muted-foreground">
          {(profile?.city || profile?.state || profile?.country) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">
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

        {/* Posts / Grid / Details / Journal icon tabs */}
        <div className="mt-6 flex items-center justify-center gap-1 border-b border-border px-5">
          {[
            { Icon: FileText, label: "Posts" },
            { Icon: Grid3x3, label: "Grid" },
            { Icon: Info, label: "Details" },
            { Icon: NotebookPen, label: "Journal" },
          ].map(({ Icon, label }, index) => (
            <button
              key={label}
              onClick={() => setActiveTab(index)}
              aria-label={label}
              title={label}
              className={cn(
                "relative flex-1 max-w-[120px] flex items-center justify-center py-3 transition-colors",
                activeTab === index ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={activeTab === index ? 2.4 : 1.8} />
              {activeTab === index && <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-foreground" />}
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
            onToggleLike={togglePostLike}
            onSharePost={(post) => setPostToShare(post)}
          />
        ) : activeTab === 1 ? (
          <PhotoGrid posts={posts} onOpenPost={setSelectedPost} onCreate={() => setShowCreatePhoto(true)} />
        ) : activeTab === 2 ? (
          <DetailsGrid
            profile={profile}
            tradingProfile={tradingProfile}
          />
        ) : (
          <JournalList
            entries={journalEntries}
            onOpenLog={() => navigate("/trading-log")}
            onChanged={async () => {
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
          />
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
        onShare={(post) => setPostToShare(post)}
      />
      <SharePostSheet post={postToShare} myId={userId} onClose={() => setPostToShare(null)} />
      <CreatePhotoAlbumModal
        open={showCreatePhoto}
        onClose={() => setShowCreatePhoto(false)}
        onCreated={refreshPosts}
      />
      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onConfirm={uploadCroppedAvatar}
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
  onToggleLike,
  onSharePost,
}: {
  posts: ProfilePostItem[];
  savedPosts: ProfilePostItem[];
  avatarUrl: string | null | undefined;
  initials: string;
  username: string;
  onOpenPost: (post: any) => void;
  onCreate: () => void;
  onToggleLike: (postId: string) => void;
  onSharePost: (post: any) => void;
}) => {
  const visiblePosts = posts.filter((p) => (p as any).share_to_feed !== false);
  if (visiblePosts.length === 0 && savedPosts.length === 0) {
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
      {visiblePosts.map((post) => {
        const media = post.media_urls?.[0] || post.media_url || post.image_url;
        return (
          <div key={post.id} className="border-b border-border px-5 py-4">
            <div onClick={() => onOpenPost(post)} className="flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/20 -mx-5 px-5 py-1">
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
                {(post.content || post.caption) && <p className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-foreground line-clamp-6">{post.content || post.caption}</p>}
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
            <div className="mt-2 ml-14 flex items-center gap-4 text-muted-foreground">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleLike(post.id); }}
                aria-label="Like"
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <Heart className={cn("h-[15px] w-[15px]", post.liked && "fill-destructive text-destructive")} />
                {(post.likeCount || 0) > 0 && <span className="text-[10px] tabular-nums">{post.likeCount}</span>}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenPost(post); }}
                aria-label="Comment"
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <MessageCircle className="h-[15px] w-[15px]" />
                {(post.commentCount || 0) > 0 && <span className="text-[10px] tabular-nums">{post.commentCount}</span>}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSharePost(post); }}
                aria-label="Share"
                className="transition-colors hover:text-foreground"
              >
                <Send className="h-[15px] w-[15px]" />
              </button>
            </div>
          </div>
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

const PhotoGrid = ({ posts, onOpenPost, onCreate }: { posts: ProfilePostItem[]; onOpenPost: (post: any) => void; onCreate?: () => void }) => {
  const photos = posts.filter((post) => {
    const media = post.media_urls?.[0] || post.media_url || post.image_url;
    if (!media) return false;
    const type = (post as any).media_type || "";
    return !type.startsWith("video");
  });

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary">
          <Camera className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-base font-bold text-foreground">No photos yet</p>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">Share photos and albums to your grid. They stay on your profile and don't post to the feed.</p>
        {onCreate && (
          <button onClick={onCreate} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            <Plus className="h-4 w-4" /> New photo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {onCreate && (
        <div className="flex justify-end px-3 pt-2 pb-1">
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-[2px] px-[2px] pb-4">
      {photos.map((post) => {
        const media = post.media_urls?.[0] || post.media_url || post.image_url;
        const isMulti = (post.media_urls?.length || 0) > 1;
        return (
          <button
            key={post.id}
            onClick={() => onOpenPost(post)}
            className="relative aspect-square overflow-hidden bg-secondary"
          >
            <img src={media!} alt="Post" className="h-full w-full object-cover" />
            {isMulti && (
              <div className="absolute right-1.5 top-1.5 rounded-full bg-background/70 px-1.5 py-0.5 text-[9px] font-bold text-foreground backdrop-blur">
                {post.media_urls!.length}
              </div>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
};

const JournalList = ({ entries, onOpenLog, onChanged }: { entries: JournalEntry[]; onOpenLog: () => void; onChanged: () => void | Promise<void> }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<JournalEntry | null>(null);

  const togglePrivacy = async (entry: JournalEntry) => {
    const next = entry.share_setting === "private" ? "partners" : "private";
    const { error } = await supabase.from("journal_entries").update({ share_setting: next }).eq("id", entry.id);
    setOpenMenuId(null);
    if (error) {
      toast.error("Couldn't update privacy");
      return;
    }
    toast.success(next === "private" ? "Marked private" : "Now visible to others");
    await onChanged();
  };

  const hideFromJournal = async (entry: JournalEntry) => {
    const { error } = await supabase
      .from("journal_entries")
      .update({ hidden_from_journal: true } as any)
      .eq("id", entry.id);
    setConfirmDeleteEntry(null);
    if (error) {
      toast.error("Couldn't remove entry");
      return;
    }
    toast.success("Removed from journal");
    await onChanged();
  };

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
    <div className="space-y-1.5 px-5 py-4">
      {entries.map((entry) => {
        const isPositive = (entry.pnl_pips || 0) >= 0;
        const isPrivate = entry.share_setting === "private";
        return (
          <div
            key={entry.id}
            className="bg-card border border-border rounded-xl p-2.5 px-3 relative"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent/15 text-accent">
                  📈 Trade
                </span>
                <span className="text-[11px] font-bold text-foreground">{formatProfileDate(entry.created_at)}</span>
                {isPrivate && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-secondary">
                    <Lock className="w-2.5 h-2.5" /> Private
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {typeof entry.pnl_pips === "number" && (
                  <span className={cn("text-sm font-extrabold", isPositive ? "text-accent" : "text-destructive")} style={{ fontFamily: "'Gabarito', sans-serif" }}>
                    {entry.pnl_unit === "dollars"
                      ? `${isPositive ? "+$" : "-$"}${Math.abs(entry.pnl_pips)}`
                      : `${(entry.pnl_pips || 0) > 0 ? "+" : ""}${entry.pnl_pips} pips`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === entry.id ? null : entry.id); }}
                  className="w-6 h-6 -mr-1 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                  aria-label="Entry options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {openMenuId === entry.id && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                <div className="absolute right-2 top-9 z-40 min-w-[150px] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                  <button
                    onClick={() => togglePrivacy(entry)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-secondary"
                  >
                    <Lock className="w-3.5 h-3.5" /> {isPrivate ? "Make public" : "Make private"}
                  </button>
                  <button
                    onClick={() => { setOpenMenuId(null); setConfirmDeleteEntry(entry); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
            <div className="text-[10px] text-muted-foreground truncate">
              {[entry.result, entry.market_pair, entry.mood].filter(Boolean).join(" · ") || "Trade entry"}
            </div>
            {entry.notes && (
              <p className="mt-1 text-[11px] text-foreground leading-snug whitespace-pre-wrap">{entry.notes}</p>
            )}
            {!!entry.tags?.length && (
              <div className="mt-1 flex flex-wrap gap-[3px]">
                {entry.tags.map((tag) => (
                  <span key={tag} className="text-[8px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-secondary text-muted-foreground">{tag}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <AlertDialog open={!!confirmDeleteEntry} onOpenChange={(open) => !open && setConfirmDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from journal?</AlertDialogTitle>
            <AlertDialogDescription>
              This entry will be removed from your profile journal. It will stay in your trading log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteEntry && hideFromJournal(confirmDeleteEntry)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const reachLabel = reach === "local" ? "Local" : reach === "global" ? "Global" : reach === "both" ? "Local/Global" : "";
  if (reachLabel) items.push({ value: reachLabel, label: "Connection Reach" });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <p className="text-base font-bold text-foreground">No details yet</p>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">Complete your onboarding info to fill this section out.</p>
      </div>
    );
  }

  return (
    <DetailCardsGrid items={items} />
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
