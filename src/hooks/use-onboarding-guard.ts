import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Checks if the current user has completed onboarding.
 * If not, shows a message and redirects to /onboarding.
 * Returns { loading, onboardingComplete } so pages can show a loading state.
 */
export function useOnboardingGuard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        navigate("/sign-in");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.onboarding_completed) {
        toast("Looks like you skipped onboarding — let's get you set up!", {
          icon: "👋",
        });
        navigate("/onboarding");
        return;
      }

      setOnboardingComplete(true);
      setLoading(false);
    };
    check();
  }, [navigate]);

  return { loading, onboardingComplete };
}
