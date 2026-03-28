import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, Edit, Share2, ImageIcon, Plus, Camera, ArrowLeft, Save, LogOut, Grid3x3 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CreatePostModal from "@/components/CreatePostModal";
import PostDetailModal from "@/components/PostDetailModal";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { toast } from "sonner";

interface ProfileData {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  gender: string | null;
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

  // Edit state
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editGender, setEditGender] = useState("");

  const [partnerCount, setPartnerCount] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: pData }, { data: tData }, { count }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("trading_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("partner_connections").select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq("status", "accepted"),
      ]);

      if (pData) {
        setProfile(pData as any);
        setEditName(pData.full_name || "");
        setEditUsername(pData.username || "");
        setEditCity((pData as any).city || "");
        setEditState((pData as any).state || "");
        setEditCountry((pData as any).country || "");
        setEditGender(pData.gender || "");
      }
      if (tData) setTradingProfile(tData);
      setPartnerCount(count ?? 0);

      // Load posts
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
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
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
    const locationParts = [editCity, editState, editCountry].filter(Boolean);
    const locationStr = locationParts.length > 0 ? locationParts.join(", ") : null;
    const { error } = await supabase.from("profiles").update({
      full_name: editName || null,
      username: editUsername || null,
      location: locationStr,
      city: editCity || null,
      state: editState || null,
      country: editCountry || null,
      gender: editGender || null,
      updated_at: new Date().toISOString(),
    } as any).eq("id", userId);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    setProfile(prev => prev ? {
      ...prev,
      full_name: editName || null,
      username: editUsername || null,
      location: locationStr,
      city: editCity || null,
      state: editState || null,
      country: editCountry || null,
      gender: editGender || null,
    } : prev);
    setEditing(false);
    toast.success("Profile updated!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const displayName = profile?.full_name || "Your Name";
  const displayUsername = profile?.username ? `@${profile.username}` : "@username";
  const displayLocation = (() => {
    if (!profile) return null;
    const { city, state, country } = profile;
    if (city && state && !country) return `${city}, ${state}`;
    if (city && state && country) return `${city}, ${state}, ${country}`;
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return profile.location || null;
  })();

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
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-semibold">Cancel</span>
            </button>
            <span className="text-base font-extrabold text-foreground">Edit Profile</span>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-bold text-sm"
            >
              {saving ? "..." : "Save"}
            </button>
          </div>

          {/* Avatar */}
          <div className="flex justify-center py-4">
            <button onClick={() => avatarInputRef.current?.click()} className="relative group">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-black text-muted-foreground">
                  {getInitials()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Fields */}
          <div className="px-5 space-y-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Full Name</label>
              <input
                value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Username</label>
              <input
                value={editUsername} onChange={e => setEditUsername(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                placeholder="username"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">City</label>
              <input
                value={editCity} onChange={e => setEditCity(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                placeholder="City"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">State / Region / Province</label>
              <input
                value={editState} onChange={e => setEditState(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                placeholder="State / Region / Province"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Country</label>
              <input
                value={editCountry} onChange={e => setEditCountry(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                placeholder="Country"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Gender</label>
              <input
                value={editGender} onChange={e => setEditGender(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                placeholder="Gender"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={() => navigate("/onboarding")}
                className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Redo Onboarding (update trading details)
              </button>
            </div>

            <div className="pt-2 pb-8">
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl border border-destructive/30 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className="text-base font-extrabold text-foreground">{displayUsername}</span>
        <div className="flex gap-2.5">
          <button onClick={() => navigate("/notifications")}>
            <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" strokeWidth={1.6} />
          </button>
          <button onClick={() => setEditing(true)}>
            <Settings className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-5 px-5 py-1.5">
          <button onClick={() => avatarInputRef.current?.click()} className="relative group">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-[76px] h-[76px] rounded-full object-cover" />
            ) : (
              <div className="w-[76px] h-[76px] rounded-full bg-muted flex items-center justify-center text-2xl font-black text-muted-foreground">
                {getInitials()}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div className="flex-1 grid grid-cols-2 text-center">
            {[
              { n: String(partnerCount), l: "Partners" },
              { n: "0", l: "Followers" },
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
              <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                <Edit className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
              </button>
              <button className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
              </button>
            </div>
          </div>
          {profile?.gender && <div className="text-[11px] text-muted-foreground mt-0.5">{profile.gender}</div>}
          {displayLocation && (
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {displayLocation}
            </div>
          )}
        </div>

        {/* Market pills */}
        {tradingProfile?.markets && tradingProfile.markets.length > 0 && (
          <div className="flex flex-wrap gap-1 px-5 py-1.5">
            {tradingProfile.markets.map(m => (
              <span key={m} className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-[hsl(var(--success))] text-[10px] font-bold text-primary-foreground">{m}</span>
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
              {activeTab === i && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-primary to-[hsl(var(--success))]" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 ? (
          posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5 pb-8">
              {posts.map((post: any) => (
                <button key={post.id} onClick={() => setSelectedPost(post)} className="aspect-square overflow-hidden bg-muted">
                  <img src={post.image_url} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No posts yet</p>
              <p className="text-xs text-muted-foreground mb-4">Start sharing your trading journey, setups, reflections, and progress.</p>
              <button
                onClick={() => setShowCreatePost(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--success))] text-xs font-bold text-primary-foreground flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create first post
              </button>
            </div>
          )
        ) : (
          hasAnyDetails ? (
            <div className="px-5 py-3 space-y-2">
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
      <CreatePostModal
        open={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreated={async () => {
          const { data } = await supabase.from("posts" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
          setPosts(data || []);
        }}
      />
      <PostDetailModal
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        myId={userId}
        onDeleted={async () => {
          const { data } = await supabase.from("posts" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
          setPosts(data || []);
        }}
      />
    </AppLayout>
  );
};

export default Profile;
