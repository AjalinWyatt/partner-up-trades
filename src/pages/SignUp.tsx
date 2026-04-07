import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, User, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import LogoHeader from "@/components/LogoHeader";
import AnimatedGlobe from "@/components/AnimatedGlobe";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

const SignUp = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [traderCount, setTraderCount] = useState(0);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

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
        data: { full_name: `${firstName} ${lastName}`.trim(), first_name: firstName, last_name: lastName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a verification code!");
      setShowOtp(true);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message);
      setOtp("");
    } else {
      toast.success("Email verified! Welcome to TradersWorld.");
      navigate("/onboarding");
    }
  };

  const handleResendCode = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("A new code has been sent to your email.");
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(error.message);
  };

  if (showOtp) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 py-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowOtp(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <LogoHeader compact />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <h1 className="text-2xl font-bold text-foreground text-center">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
          </p>

          <div className="mt-8">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0,1,2,3,4,5].map(i => (
                  <InputOTPSlot key={i} index={i} className="w-12 h-14 text-lg border-border bg-card text-foreground" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={otp.length < 6 || verifying}
            className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 text-sm font-bold mt-8 border-none rounded-xl"
          >
            {verifying ? "Verifying…" : "Verify & Continue"}
            {!verifying && <ArrowRight className="ml-2 w-4 h-4" />}
          </Button>

          <button onClick={handleResendCode} className="text-sm text-accent hover:underline mt-4">
            Didn't get a code? Resend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Globe header */}
      <div className="relative pt-6 pb-1 flex flex-col items-center">
        <div className="w-28 h-28">
          <AnimatedGlobe />
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight mt-1">
          Traders<span className="font-black">World</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Create an account</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-8 pb-8">
        <form onSubmit={handleSignUp} className="flex flex-col gap-5 mt-4">
          {/* First Name */}
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <User className="w-4 h-4 text-accent shrink-0" />
            <input
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              required
            />
          </div>

          {/* Last Name */}
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <User className="w-4 h-4 text-accent shrink-0" />
            <input
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              required
            />
          </div>

          {/* Email */}
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

          {/* Password */}
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <Lock className="w-4 h-4 text-accent shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground shrink-0">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <Lock className="w-4 h-4 text-accent shrink-0" />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-muted-foreground hover:text-foreground shrink-0">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-bold rounded-xl border-none mt-2"
          >
            {loading ? "Creating…" : "Sign Up"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By creating an account you agree to our{" "}
          <span className="text-accent cursor-pointer">Terms of Service</span> and{" "}
          <span className="text-accent cursor-pointer">Privacy Policy</span>.
        </p>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Don't have an Account?{" "}
          <button onClick={() => navigate("/sign-in")} className="text-accent font-medium hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
