import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, AlertCircle, LogOut, Trash2, ShieldOff, Bell, User as UserIcon, Eye, FileText, Sparkles, Smartphone } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

const MAX_USERNAME_CHANGES = 3;

interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  username_changes_count: number;
  notify_partner_activity: boolean;
  notify_new_matches: boolean;
  notify_messages: boolean;
  notify_email: boolean;
  profile_visibility: string;
}

interface BlockedRow {
  id: string;
  blocked_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

export default function Settings() {
  const navigate = useNavigate();
  useOnboardingGuard();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { navigate("/sign-in"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, full_name, username_changes_count, notify_partner_activity, notify_new_matches, notify_messages, notify_email, profile_visibility")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        setProfile(p as any);
        setFullName(p.full_name || "");
        setUsernameDraft(p.username || "");
      }
      await loadBlocked(user.id);
      setLoading(false);
    })();
  }, [navigate]);

  async function loadBlocked(uid: string) {
    const { data: rows } = await supabase
      .from("blocked_users")
      .select("id, blocked_id")
      .eq("blocker_id", uid);
    if (!rows || rows.length === 0) { setBlocked([]); return; }
    const ids = rows.map(r => r.blocked_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);
    const byId = new Map((profs || []).map(p => [p.id, p]));
    setBlocked(rows.map(r => ({
      id: r.id,
      blocked_id: r.blocked_id,
      username: byId.get(r.blocked_id)?.username || null,
      full_name: byId.get(r.blocked_id)?.full_name || null,
      avatar_url: byId.get(r.blocked_id)?.avatar_url || null,
    })));
  }

  // Live username availability check
  useEffect(() => {
    if (!profile) return;
    const v = usernameDraft.trim().toLowerCase();
    setUsernameError(null);
    setUsernameAvailable(null);
    if (v === (profile.username || "")) return;
    if (!v) { setUsernameError("Username can't be empty"); return; }
    if (/\s/.test(v)) { setUsernameError("Usernames are one word — no spaces"); return; }
    if (!USERNAME_RE.test(v)) {
      setUsernameError("3–30 chars, lowercase letters, numbers, _ or . only");
      return;
    }
    let cancelled = false;
    setUsernameChecking(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", v)
        .neq("id", profile.id)
        .maybeSingle();
      if (cancelled) return;
      setUsernameChecking(false);
      if (error) { setUsernameError("Couldn't check availability"); return; }
      setUsernameAvailable(!data);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); setUsernameChecking(false); };
  }, [usernameDraft, profile]);

  const changesLeft = profile ? Math.max(0, MAX_USERNAME_CHANGES - (profile.username_changes_count || 0)) : 0;
  const canSaveUsername =
    !!profile &&
    usernameAvailable === true &&
    !usernameError &&
    usernameDraft.trim().toLowerCase() !== (profile.username || "") &&
    changesLeft > 0;

  async function saveUsername() {
    if (!profile || !canSaveUsername) return;
    setSavingUsername(true);
    const newUsername = usernameDraft.trim().toLowerCase();
    const { error } = await supabase
      .from("profiles")
      .update({
        username: newUsername,
        username_changes_count: (profile.username_changes_count || 0) + 1,
      })
      .eq("id", profile.id);
    setSavingUsername(false);
    if (error) {
      toast.error(error.message.includes("unique") ? "That username was just taken" : "Couldn't update username");
      return;
    }
    toast.success("Username updated");
    setProfile({ ...profile, username: newUsername, username_changes_count: profile.username_changes_count + 1 });
  }

  async function saveFullName() {
    if (!profile) return;
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
    setSavingName(false);
    if (error) { toast.error("Couldn't update name"); return; }
    toast.success("Name updated");
    setProfile({ ...profile, full_name: fullName });
  }

  async function toggleNotif(field: keyof ProfileRow, value: boolean) {
    if (!profile) return;
    setProfile({ ...profile, [field]: value } as any);
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", profile.id);
    if (error) {
      toast.error("Couldn't save preference");
      setProfile({ ...profile, [field]: !value } as any);
    }
  }

  async function setVisibility(v: string) {
    if (!profile) return;
    setProfile({ ...profile, profile_visibility: v });
    const { error } = await supabase.from("profiles").update({ profile_visibility: v }).eq("id", profile.id);
    if (error) { toast.error("Couldn't update visibility"); }
  }

  async function unblock(rowId: string) {
    const { error } = await supabase.from("blocked_users").delete().eq("id", rowId);
    if (error) { toast.error("Couldn't unblock"); return; }
    setBlocked(prev => prev.filter(b => b.id !== rowId));
    toast.success("Unblocked");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/sign-in", { replace: true });
  }

  async function deleteAccount() {
    if (!confirm("Permanently delete your account? This can't be undone.")) return;
    if (!confirm("Are you absolutely sure? All your data will be erased.")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Couldn't delete account");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center gap-3 px-5 pt-safe-3 pb-2 border-b border-border">
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-8 h-8 -ml-1 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-black text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-5 pt-4 space-y-6">
        {/* Account */}
        <Section icon={<UserIcon className="w-4 h-4" />} title="Account">
          <Field label="Email">
            <input
              value={email}
              disabled
              className="w-full py-2.5 px-3 rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Email changes aren't supported yet.</p>
          </Field>

          <Field label="Display name">
            <div className="flex gap-2">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={60}
                placeholder="Your name"
                className="flex-1 py-2.5 px-3 rounded-lg border border-border bg-secondary text-sm text-foreground outline-none focus:border-accent"
              />
              <button
                onClick={saveFullName}
                disabled={savingName || fullName === (profile?.full_name || "")}
                className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-[12px] font-bold disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </Field>

          <Field label={`Username (${changesLeft} change${changesLeft === 1 ? "" : "s"} left)`}>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center rounded-lg border border-border bg-secondary focus-within:border-accent overflow-hidden">
                <span className="pl-3 text-sm text-muted-foreground">@</span>
                <input
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value.replace(/\s+/g, "").toLowerCase())}
                  maxLength={30}
                  disabled={changesLeft <= 0}
                  placeholder="username"
                  className="flex-1 py-2.5 px-2 bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
                />
                <span className="pr-3">
                  {usernameChecking ? (
                    <div className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  ) : usernameAvailable === true ? (
                    <Check className="w-4 h-4 text-accent" />
                  ) : usernameAvailable === false || usernameError ? (
                    <X className="w-4 h-4 text-destructive" />
                  ) : null}
                </span>
              </div>
              <button
                onClick={saveUsername}
                disabled={!canSaveUsername || savingUsername}
                className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-[12px] font-bold disabled:opacity-50"
              >
                Save
              </button>
            </div>
            <div className="mt-1 text-[11px]">
              {changesLeft <= 0 ? (
                <span className="text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> You've used all 3 username changes.</span>
              ) : usernameError ? (
                <span className="text-destructive">{usernameError}</span>
              ) : usernameAvailable === false ? (
                <span className="text-destructive">That username is taken</span>
              ) : usernameAvailable === true ? (
                <span className="text-accent">Available ✓</span>
              ) : (
                <span className="text-muted-foreground">One word, lowercase letters/numbers/_/. Max 3 changes ever.</span>
              )}
            </div>
          </Field>
        </Section>

        {/* Notifications */}
        <Section icon={<Bell className="w-4 h-4" />} title="Notifications">
          <Toggle label="Partner activity" desc="When a partner logs, wins, or struggles" value={profile!.notify_partner_activity} onChange={(v) => toggleNotif("notify_partner_activity", v)} />
          <Toggle label="New matches" desc="When a new trader matching you joins" value={profile!.notify_new_matches} onChange={(v) => toggleNotif("notify_new_matches", v)} />
          <Toggle label="Messages" desc="DMs from your partners" value={profile!.notify_messages} onChange={(v) => toggleNotif("notify_messages", v)} />
          <Toggle label="Email" desc="Receive product emails" value={profile!.notify_email} onChange={(v) => toggleNotif("notify_email", v)} />
        </Section>

        {/* Privacy */}
        <Section icon={<Eye className="w-4 h-4" />} title="Privacy">
          <Field label="Profile visibility">
            <div className="flex gap-2">
              {([
                { v: "public", label: "Public" },
                { v: "partners", label: "Partners only" },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setVisibility(opt.v)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-[12px] font-bold",
                    profile!.profile_visibility === opt.v
                      ? "border-accent bg-accent/[0.12] text-accent"
                      : "border-border bg-secondary text-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Blocked users (${blocked.length})`}>
            {blocked.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">You haven't blocked anyone.</p>
            ) : (
              <div className="space-y-1.5">
                {blocked.map((b) => (
                  <div key={b.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-secondary">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                      {b.avatar_url ? (
                        <img src={b.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {(b.username || b.full_name || "U").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-foreground truncate">{b.full_name || b.username || "Trader"}</div>
                      {b.username && <div className="text-[11px] text-muted-foreground truncate">@{b.username}</div>}
                    </div>
                    <button
                      onClick={() => unblock(b.id)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-border text-foreground hover:bg-card"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <ShieldOff className="w-3 h-3" /> Block traders from a profile to add them here.
            </p>
          </Field>
        </Section>

        {/* Legal */}
        <Section icon={<FileText className="w-4 h-4" />} title="About">
          <button onClick={() => navigate("/terms")} className="w-full text-left text-[13px] text-foreground py-2 border-b border-border">Terms of Service</button>
          <button onClick={() => navigate("/privacy")} className="w-full text-left text-[13px] text-foreground py-2">Privacy Policy</button>
        </Section>

        {/* Walkthrough */}
        <Section icon={<Sparkles className="w-4 h-4" />} title="Help">
          <button
            onClick={() => {
              sessionStorage.setItem("tw:replay-tour", "1");
              toast.success("Replaying walkthrough…");
              navigate("/dashboard");
            }}
            className="w-full text-left text-[13px] text-foreground py-2 flex items-center justify-between"
          >
            <span>Replay walkthrough</span>
            <span className="text-muted-foreground text-[11px]">~60s tour</span>
          </button>
          <button
            onClick={() => navigate("/install")}
            className="w-full text-left text-[13px] text-foreground py-2 flex items-center justify-between border-t border-border"
          >
            <span className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5 text-muted-foreground" /> Install on your phone</span>
            <span className="text-muted-foreground text-[11px]">iPhone / Android</span>
          </button>
        </Section>

        {/* Danger zone */}
        <Section icon={<AlertCircle className="w-4 h-4 text-destructive" />} title="Account actions" titleClass="text-destructive">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border bg-secondary text-[13px] font-bold text-foreground"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
          <button
            onClick={deleteAccount}
            disabled={deleting}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-destructive/40 bg-destructive/10 text-[13px] font-bold text-destructive disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> {deleting ? "Deleting…" : "Delete my account"}
          </button>
          <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
            Deleting your account erases your profile, posts, logs and connections.
          </p>
        </Section>
      </div>
    </AppLayout>
  );
}

function Section({ icon, title, titleClass, children }: { icon: React.ReactNode; title: string; titleClass?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className={cn("flex items-center gap-1.5 mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground", titleClass)}>
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-3 bg-card/50 border border-border rounded-2xl p-3.5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-10 h-6 rounded-full transition-colors shrink-0",
          value ? "bg-accent" : "bg-muted"
        )}
        aria-pressed={value}
      >
        <span
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all",
            value ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}