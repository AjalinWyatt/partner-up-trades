import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, Edit, Share2, ImageIcon, Plus, Camera, ArrowLeft, Grid3x3, MapPin, LogOut } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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

  // Edit state
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
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
        setEditBio((pData as any).bio || "");
        setEditCity((pData as any).city || "");
        setEditState((pData as any).state || "");
        setEditCountry((pData as any).country || "");
        setEditGender(pData.gender || "");
      }
      if (tData) setTradingProfile(tData);
      setPartnerCount(count ?? 0);

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
      bio: editBio || null,
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
      bio: editBio || null,
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
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <button onClick={() => setEditing(false)} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <span className="text-base font-extrabold text-foreground">Edit Profile</span>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="text-sm font-bold text-primary hover:text-primary/80"
            >
              {saving ? "Saving..." : "Done"}
            </button>
          </div>

          {/* Avatar */}
          <div className="flex justify-center py-5">
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => avatarInputRef.current?.click()} className="relative group">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-black text-muted-foreground ring-2 ring-border">
                    {getInitials()}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>
              <button onClick={() => avatarInputRef.current?.click()} className="text-xs font-bold text-primary">
                Change photo
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          {/* Fields */}
          <div className="px-5 space-y-4 pb-8">
            <EditField label="Full Name" value={editName} onChange={setEditName} placeholder="Your full name" />
            <EditField label="Username" value={editUsername} onChange={setEditUsername} placeholder="username" />
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Bio</label>
              <Textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                className="bg-secondary border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-primary min-h-[80px] resize-none"
                placeholder="Tell traders about yourself..."
                maxLength={150}
              />
              <div className="text-[10px] text-muted-foreground text-right mt-1">{editBio.length}/150</div>
            </div>
            <EditField label="City" value={editCity} onChange={setEditCity} placeholder="City" />
            <EditField label="State / Region / Province" value={editState} onChange={setEditState} placeholder="State / Region" />
            <EditField label="Country" value={editCountry} onChange={setEditCountry} placeholder="Country" />
            <EditField label="Gender" value={editGender} onChange={setEditGender} placeholder="Gender" />

            <div className="pt-3">
              <button
                onClick={() => navigate("/onboarding")}
                className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Update trading details
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl border border-destructive/30 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-border">
        <span className="text-sm font-extrabold text-foreground tracking-tight">{displayUsername}</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreatePost(true)} className="text-foreground hover:text-primary transition-colors">
            <Plus className="w-5 h-5" strokeWidth={2} />
          </button>
          <button onClick={() => navigate("/notifications")}>
            <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" strokeWidth={1.6} />
          </button>
          <button onClick={() => setEditing(true)}>
            <Settings className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile header */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <button onClick={() => avatarInputRef.current?.click()} className="relative group shrink-0">
              <div className="w-[80px] h-[80px] rounded-full p-[2px] bg-gradient-to-tr from-primary to-accent">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover border-2 border-background" />
                ) : (
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-xl font-black text-muted-foreground border-2 border-background">
                    {getInitials()}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            {/* Stats */}
            <div className="flex-1 grid grid-cols-3 text-center gap-2">
              <StatItem value={posts.length} label="Posts" />
              <StatItem value={partnerCount} label="Partners" />
              <StatItem value={0} label="Followers" />
            </div>
          </div>

          {/* Name & bio */}
          <div className="mt-3">
            <div className="text-sm font-extrabold text-foreground">{displayName}</div>

            {/* Market pills inline */}
            {tradingProfile?.markets && tradingProfile.markets.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tradingProfile.markets.map(m => (
                  <span key={m} className="px-2 py-[1px] rounded-full bg-primary/15 text-[10px] font-bold text-primary">{m}</span>
                ))}
                {tradingProfile?.experience_level && (
                  <span className="px-2 py-[1px] rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {tradingProfile.experience_level}
                  </span>
                )}
              </div>
            )}

            {/* Bio */}
            {profile?.bio && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line">{profile.bio}</p>
            )}

            {/* Location */}
            {displayLocation && (
              <div className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {displayLocation}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 py-1.5 rounded-lg bg-secondary border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              Edit profile
            </button>
            <button className="flex-1 py-1.5 rounded-lg bg-secondary border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors">
              Share profile
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mt-2">
          {[
            { label: "POSTS", icon: <Grid3x3 className="w-4 h-4" /> },
            { label: "DETAILS", icon: <Settings className="w-4 h-4" /> },
          ].map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider relative transition-colors",
                activeTab === i ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === i && <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-primary to-accent" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 ? (
          posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-[1px] bg-border">
              {posts.map((post: any) => (
                <button key={post.id} onClick={() => setSelectedPost(post)} className="aspect-square overflow-hidden bg-background">
                  <img src={post.image_url} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full border-2 border-muted-foreground flex items-center justify-center mb-4">
                <Camera className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-xl font-extrabold text-foreground mb-1">Share Photos</p>
              <p className="text-xs text-muted-foreground mb-5 max-w-[240px]">When you share photos, they will appear on your profile.</p>
              <button
                onClick={() => setShowCreatePost(true)}
                className="text-xs font-bold text-primary hover:text-primary/80"
              >
                Share your first photo
              </button>
            </div>
          )
        ) : (
          hasAnyDetails ? (
            <div className="px-5 py-4 space-y-3 pb-8">
              {(tradingProfile?.experience_level || (tradingProfile?.primary_goal && tradingProfile.primary_goal.length > 0)) && (
                <div className="bg-card border border-border rounded-xl p-3.5">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Overview</div>
                  {tradingProfile?.experience_level && (
                    <div className="flex justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-[11px] text-muted-foreground">Experience</span>
                      <span className="text-[11px] font-bold text-foreground">{tradingProfile.experience_level}</span>
                    </div>
                  )}
                  {tradingProfile?.primary_goal && tradingProfile.primary_goal.length > 0 && (
                    <div className="flex justify-between py-1.5">
                      <span className="text-[11px] text-muted-foreground">Goals</span>
                      <span className="text-[11px] font-bold text-foreground text-right">{tradingProfile.primary_goal.join(", ")}</span>
                    </div>
                  )}
                </div>
              )}

              {detailSections.map(section => {
                if (!section.data || section.data.length === 0) return null;
                return (
                  <div key={section.title} className="bg-card border border-border rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {section.data.map(d => (
                        <span key={d} className="px-2.5 py-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full border-2 border-muted-foreground flex items-center justify-center mb-4">
                <Settings className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-xl font-extrabold text-foreground mb-1">Trading Details</p>
              <p className="text-xs text-muted-foreground mb-5 max-w-[240px]">Complete onboarding to show your trading identity.</p>
              <button
                onClick={() => navigate("/onboarding")}
                className="text-xs font-bold text-primary hover:text-primary/80"
              >
                Complete setup
              </button>
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

const StatItem = ({ value, label }: { value: number; label: string }) => (
  <div>
    <div className="text-lg font-extrabold text-foreground">{value}</div>
    <div className="text-[11px] text-muted-foreground">{label}</div>
  </div>
);

export default Profile;
