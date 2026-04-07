import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoHeader from "@/components/LogoHeader";
import AnimatedGlobe from "@/components/AnimatedGlobe";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted || !session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();
      if (mounted) navigate(profile?.onboarding_completed ? "/feed" : "/onboarding", { replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted || !session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();
      if (mounted) navigate(profile?.onboarding_completed ? "/feed" : "/onboarding", { replace: true });
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error("Please verify your email first. Check your inbox for a confirmation link.");
      } else {
        toast.error(error.message);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a password reset link.");
      setShowForgot(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Globe header area */}
      <div className="relative pt-8 pb-2 flex flex-col items-center">
        <div className="w-40 h-40">
          <AnimatedGlobe />
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight mt-2">
          Traders<span className="font-black">World</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trade Smarter <span className="text-accent">●</span> Stay Consistent.
        </p>
      </div>

      {/* Form area */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-8 pb-8">
        <form onSubmit={handleSignIn} className="flex flex-col gap-5 mt-6">
          {/* Email underline input */}
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <Mail className="w-4 h-4 text-accent shrink-0" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              required
            />
          </div>

          {/* Password underline input */}
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <Lock className="w-4 h-4 text-accent shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${rememberMe ? "bg-accent border-accent" : "border-border"}`}
              >
                {rememberMe && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent-foreground">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Remember me</span>
            </label>
            <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline">
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-bold rounded-xl border-none mt-2"
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social icons as circles */}
        <div className="flex justify-center gap-5">
          <button className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center hover:border-accent/50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" className="text-[#1877F2]" />
            </svg>
          </button>
          <button
            onClick={() => handleOAuth("google")}
            className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center hover:border-accent/50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button
            onClick={() => handleOAuth("apple")}
            className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center hover:border-accent/50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.65-2.2.46-3.06-.4C3.79 16.17 4.36 9.53 8.7 9.3c1.28.06 2.15.72 2.92.76.99-.2 1.95-.89 3.01-.8 1.28.1 2.24.6 2.87 1.5-2.62 1.57-2 4.98.6 5.94-.47 1.23-.68 1.79-1.32 2.87l.27.71zM12.05 9.24C11.87 7.14 13.6 5.4 15.62 5.25c.3 2.36-2.14 4.14-3.57 3.99z"/>
            </svg>
          </button>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-8">
          Don't have an Account?{" "}
          <button onClick={() => navigate("/sign-up")} className="text-accent font-medium hover:underline">
            Sign Up
          </button>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-foreground">Reset password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleForgotPassword} className="mt-4 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-border pb-2">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <input
                  type="email"
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgot(false)}
                  className="flex-1 h-10 border-border text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 h-10 bg-accent text-accent-foreground hover:bg-accent/90 border-none"
                >
                  {forgotLoading ? "Sending…" : "Send link"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;
