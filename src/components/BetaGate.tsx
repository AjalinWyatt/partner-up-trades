import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import Wordmark from "@/components/Wordmark";
import AuthGlobeBackground from "@/components/AuthGlobeBackground";

const BETA_KEY = "BetaKeyxTWxSecret";
const STORAGE_KEY = "tw:beta-unlocked:v4";

const BetaGate = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "1"
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === BETA_KEY) {
      localStorage.removeItem("tw:beta-unlocked"); localStorage.removeItem("tw:beta-unlocked:v2"); localStorage.removeItem("tw:beta-unlocked:v3");
      localStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setError("");
    } else {
      setError("That beta key isn't valid.");
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative flex flex-col min-h-screen bg-background overflow-hidden">
      <AuthGlobeBackground height={340} />
      <div
        className="relative z-10 flex-1 flex flex-col px-7 pb-8 max-w-md mx-auto w-full"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 200px)" }}
      >
        <div className="flex justify-center"><Wordmark size="text-3xl" /></div>
        <p className="text-[18px] text-foreground text-center mt-4">Private beta access</p>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Enter your beta key to view TradersWorld.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-8">
          <div>
            <div className="flex items-center gap-3 pb-2">
              <KeyRound className="w-5 h-5 text-accent shrink-0" strokeWidth={1.8} />
              <input
                placeholder="Beta Key"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(""); }}
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/80 outline-none"
                required
                autoFocus
              />
            </div>
            <div className="h-px bg-border" />
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground text-[16px] font-bold rounded-2xl border-none shadow-none"
          >
            Enter
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already have an account?{" "}
          <button onClick={() => navigate("/sign-in")} className="text-accent font-semibold hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default BetaGate;
