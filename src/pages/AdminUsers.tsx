import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
      const { data, error } = await supabase.functions.invoke("admin-list-users");
      if (error) {
        toast.error(error.message || "Failed to load users");
      } else {
        setUsers((data as any)?.users ?? []);
      }
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
                <div className="col-span-4 min-w-0">
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
                <div className="col-span-4 min-w-0">
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
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {formatDate(u.last_sign_in_at)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;