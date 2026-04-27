import { useEffect, useState } from "react";
import { useSessionCache } from "@/hooks/use-session-cache";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bookmark } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

interface SavedRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
}

const Saved = () => {
  const { loading: guardLoading } = useOnboardingGuard();
  const navigate = useNavigate();
  const [items, setItems, hadCache] = useSessionCache<SavedRow[]>("saved:items", []);
  const [loading, setLoading] = useState(!hadCache);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const { data: saves } = await supabase
        .from("saved_profiles")
        .select("saved_id, created_at")
        .eq("saver_id", user.id)
        .order("created_at", { ascending: false });

      const ids = (saves || []).map((s: any) => s.saved_id);
      if (ids.length === 0) { setItems([]); setLoading(false); return; }

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, city, country")
        .in("id", ids);

      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      setItems(ids.map(id => map.get(id)).filter(Boolean) as SavedRow[]);
      setLoading(false);
    };
    load();
  }, []);

  if (guardLoading || loading) {
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
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-5 pt-safe-5 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[22px] font-black tracking-tight text-foreground">My Saved</h1>
        </div>

        <div className="px-5 mt-6">
          {items.length === 0 ? (
            <div className="bg-card/40 border border-border rounded-2xl p-8 text-center">
              <Bookmark className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
              <p className="text-[14px] text-foreground font-semibold mb-1">No saved traders yet</p>
              <p className="text-[12px] text-muted-foreground">
                Save traders from Discover to revisit them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((m) => {
                const loc = [m.city, m.country].filter(Boolean).join(", ");
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/profile/${m.id}`)}
                    className="w-full bg-card border border-border rounded-2xl overflow-hidden flex items-stretch text-left hover:border-accent/40 transition-colors h-[88px]"
                  >
                    <div className="w-[88px] h-full shrink-0 bg-secondary">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <span className="text-xl font-bold text-foreground">
                            {(m.full_name || m.username || "?").slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-1">
                      <div className="text-[15px] font-bold text-accent truncate">
                        {m.full_name || (m.username ? `@${m.username}` : "Trader")}
                      </div>
                      {loc && <div className="text-[12px] text-foreground/80 truncate">{loc}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Saved;