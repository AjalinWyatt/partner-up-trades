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

  const handleOAuth = async (provider: "google" | "apple") => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(error.message);
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

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[13px] text-foreground">or sign up with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social buttons */}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            aria-label="Sign up with Google"
            className="w-16 h-14 rounded-2xl border border-border bg-card flex items-center justify-center hover:border-accent/50 transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("apple")}
            aria-label="Sign up with Apple"
            className="w-16 h-14 rounded-2xl border border-border bg-card flex items-center justify-center hover:border-accent/50 transition-colors"
          >
            <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.65-2.2.46-3.06-.4C3.79 16.17 4.36 9.53 8.7 9.3c1.28.06 2.15.72 2.92.76.99-.2 1.95-.89 3.01-.8 1.28.1 2.24.6 2.87 1.5-2.62 1.57-2 4.98.6 5.94-.47 1.23-.68 1.79-1.32 2.87l.27.71zM12.05 9.24C11.87 7.14 13.6 5.4 15.62 5.25c.3 2.36-2.14 4.14-3.57 3.99z"/>
            </svg>
          </button>
        </div>

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
