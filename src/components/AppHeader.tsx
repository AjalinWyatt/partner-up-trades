import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Wordmark from "@/components/Wordmark";
import { supabase } from "@/integrations/supabase/client";

/**
 * Unified top header used across the main app pages.
 * Always renders the TradersWorld wordmark + a circular profile photo
 * that navigates the user to their own profile.
 */
export default function AppHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("U");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !active) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, username")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setAvatar(data?.avatar_url || null);
      const name = data?.full_name || data?.username || user.email || "U";
      setInitials(
        name
          .split(/\s+/)
          .map((p: string) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase() || "U"
      );
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="relative flex items-center justify-center px-5 pt-3 pb-2">
      <Wordmark size="text-lg" />
      <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {rightSlot}
        <button
          onClick={() => navigate("/profile")}
          aria-label="Open my profile"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-foreground transition-colors hover:bg-muted"
        >
          {avatar ? (
            <img src={avatar} alt="My profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold">{initials}</span>
          )}
        </button>
      </div>
    </div>
  );
}