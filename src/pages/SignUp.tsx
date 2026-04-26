import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoHeader from "@/components/LogoHeader";
import AuthGlobeBackground from "@/components/AuthGlobeBackground";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import Wordmark from "@/components/Wordmark";
import { trackEvent } from "@/lib/analytics";

const SignUp = () => {
  const navigate = useNavigate();
  // Beta gate - only allow sign-up for testers who unlocked it on the landing page
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("beta_unlocked") !== "1") {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [traderCount, setTraderCount] = useState(0);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted || !session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();
      navigate(profile?.onboarding_completed ? "/feed" : "/onboarding", { replace: true });
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted || !session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();
      navigate(profile?.onboarding_completed ? "/feed" : "/onboarding", { replace: true });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    supabase.from("profiles").select("*", { count: "exact", head: true }).then(({ count }) => setTraderCount(count ?? 0));
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { full_name: `${firstName} ${lastName}`.trim(), first_name: firstName, last_name: lastName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      trackEvent("signup_verified", { method: "email" });
      toast.success("Check your email (and spam/junk folder) to finish signing up.");
      setEmailSent(true);
    }
  };

  const handleResendCode = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email sent again.");
    }
  };

  if (emailSent) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 pb-8 pt-safe-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setEmailSent(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <LogoHeader compact />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <h1 className="text-2xl font-bold text-foreground text-center">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>. Click it and you'll be signed in automatically.
          </p>

          <div className="mt-5 w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-center">
            <p className="text-sm text-foreground font-medium">Don't see it?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Check your <span className="text-foreground font-medium">spam</span> or <span className="text-foreground font-medium">junk</span> folder — sometimes the confirmation email lands there.
            </p>
          </div>

          <button onClick={handleResendCode} className="text-sm text-accent hover:underline mt-4">
            Didn't get the email? Resend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-background overflow-hidden">
      {/* Globe background bleeding from top (smaller for sign-up) */}
      <AuthGlobeBackground height={340} />

      {/* Back button */}
      <button
        onClick={() => navigate("/sign-in")}
        className="absolute left-5 z-20 w-10 h-10 flex items-center justify-center text-foreground"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1.5rem)" }}
      >
        <ChevronLeft className="w-7 h-7" />
      </button>

      {/* Content */}
      <div
        className="relative z-10 flex-1 flex flex-col px-7 pb-8 max-w-md mx-auto w-full"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 200px)" }}
      >
        <div className="flex justify-center"><Wordmark size="text-3xl" /></div>
        <p className="text-[18px] text-foreground text-center mt-4">Create an account</p>

        {/* Form */}
        <form onSubmit={handleSignUp} className="flex flex-col gap-6 mt-8">
          <div>
            <div className="flex items-center gap-3 pb-2">
              <User className="w-5 h-5 text-accent shrink-0" fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} />
              <input
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/80 outline-none"
                required
              />
            </div>
            <div className="h-px bg-border" />
          </div>

          <div>
            <div className="flex items-center gap-3 pb-2">
              <User className="w-5 h-5 text-accent shrink-0" fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} />
              <input
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/80 outline-none"
                required
              />
            </div>
            <div className="h-px bg-border" />
          </div>

          <div>
            <div className="flex items-center gap-3 pb-2">
              <Mail className="w-5 h-5 text-accent shrink-0" fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/80 outline-none"
                required
              />
            </div>
            <div className="h-px bg-border" />
          </div>

          <div>
            <div className="flex items-center gap-3 pb-2">
              <Lock className="w-5 h-5 text-accent shrink-0" fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/80 outline-none"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground shrink-0">
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            <div className="h-px bg-border" />
          </div>

          <div>
            <div className="flex items-center gap-3 pb-2">
              <Lock className="w-5 h-5 text-accent shrink-0" fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/80 outline-none"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-muted-foreground hover:text-foreground shrink-0">
                {showConfirm ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            <div className="h-px bg-border" />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground text-[16px] font-bold rounded-2xl border-none mt-4 shadow-none"
          >
            {loading ? "Creating…" : "Sign Up"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By creating an account you agree to our{" "}
          <a href="/terms" className="text-accent hover:underline">Terms of Service</a> and{" "}
          <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>.
        </p>

        <p className="text-sm text-muted-foreground text-center mt-4">
          Already have an account?{" "}
          <button onClick={() => navigate("/sign-in")} className="text-accent font-semibold hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
