import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal } from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  phone: string | null;
  providers: string[];
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  banned_until?: string | null;
  is_banned?: boolean;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    const hours = Math.floor(diff / 3600000);
    if (hours === 0) return "Just now";
    return `${hours}h ago`;
  }
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [adminChecked, setAdminChecked] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<{
    user: AdminUser;
    action: "delete" | "ban" | "timeout";
    hours?: number;
  } | null>(null);
  const [working, setWorking] = useState(false);

  const refresh = async () => {
    const { data, error } = await supabase.functions.invoke("admin-list-users");
    if (error) toast.error(error.message || "Failed to load users");
    else setUsers((data as any)?.users ?? []);
  };

  const runAction = async (
    user: AdminUser,
    action: "delete" | "ban" | "unban" | "timeout",
    hours?: number,
  ) => {
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("admin-user-action", {
      body: { target_user_id: user.id, action, duration_hours: hours },
    });
    setWorking(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Action failed");
      return;
    }
    toast.success(
      action === "delete"
        ? "User deleted"
        : action === "ban"
        ? "User banned"
        : action === "unban"
        ? "User unbanned"
        : `User timed out for ${hours}h`,
    );
    setPending(null);
    await refresh();
  };

  useEffect(() => {
    // Wait one tick for the admin hook to resolve
    const t = setTimeout(() => setAdminChecked(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!adminChecked) return;
    if (!isAdmin) {
      navigate("/feed", { replace: true });
      return;
    }
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [adminChecked, isAdmin, navigate]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q),
      )
    : users;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Loading…" : `${filtered.length} of ${users.length} users`}
            </p>
          </div>
          <Input
            placeholder="Search name, username, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs bg-card border-border"
          />
        </div>

        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
            <div className="col-span-4">Name / Username</div>
            <div className="col-span-4">Email / Phone</div>
            <div className="col-span-2">Provider</div>
            <div className="col-span-2">Last sign-in</div>
          </div>

          {loading && (
            <div className="px-4 py-12 text-center text-muted-foreground">Loading users…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-muted-foreground">No users found</div>
          )}

          {!loading &&
            filtered.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border/60 last:border-b-0 items-center hover:bg-muted/30 transition-colors"
              >
                <div className="col-span-3 min-w-0">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-semibold text-accent shrink-0">
                        {(u.full_name || u.username || u.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {u.full_name || <span className="text-muted-foreground italic">No name</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.username ? `@${u.username}` : "—"}
                        {!u.onboarding_completed && (
                          <span className="ml-2 text-amber-500">· onboarding incomplete</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 min-w-0">
                  <div className="text-sm truncate">{u.email || "—"}</div>
                  {u.phone && <div className="text-xs text-muted-foreground truncate">{u.phone}</div>}
                </div>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {u.providers.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  {u.providers.map((p) => (
                    <Badge key={p} variant="secondary" className="capitalize text-xs">
                      {p}
                    </Badge>
                  ))}
                  {u.is_banned && (
                    <Badge variant="destructive" className="text-xs">banned</Badge>
                  )}
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {formatDate(u.last_sign_in_at)}
                </div>
                <div className="col-span-2 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-popover">
                      <DropdownMenuLabel>Moderation</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {u.is_banned ? (
                        <DropdownMenuItem onClick={() => runAction(u, "unban")}>
                          Unban user
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Timeout</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-popover">
                              {[1, 24, 72, 168].map((h) => (
                                <DropdownMenuItem
                                  key={h}
                                  onClick={() => setPending({ user: u, action: "timeout", hours: h })}
                                >
                                  {h === 1 ? "1 hour" : h === 24 ? "1 day" : h === 72 ? "3 days" : "7 days"}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem onClick={() => setPending({ user: u, action: "ban" })}>
                            Ban permanently
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setPending({ user: u, action: "delete" })}
                      >
                        Delete user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
        </div>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.action === "delete" && "Delete this user?"}
              {pending?.action === "ban" && "Ban this user?"}
              {pending?.action === "timeout" && `Timeout for ${pending?.hours}h?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.action === "delete" &&
                "This permanently removes their account, profile, posts, messages and all related data. This cannot be undone."}
              {pending?.action === "ban" &&
                "The user will be signed out and blocked from signing in indefinitely. You can unban them later."}
              {pending?.action === "timeout" &&
                "The user will be signed out and unable to sign in until the timeout expires."}
              {pending && (
                <span className="block mt-2 text-foreground">
                  {pending.user.full_name || pending.user.username || pending.user.email || pending.user.id}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={working}
              onClick={(e) => {
                e.preventDefault();
                if (!pending) return;
                runAction(pending.user, pending.action, pending.hours);
              }}
              className={pending?.action === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {working ? "Working…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;