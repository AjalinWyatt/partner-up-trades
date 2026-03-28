import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedGlobe from "@/components/AnimatedGlobe";
import MarqueeFooter from "@/components/MarqueeFooter";
import LogoHeader from "@/components/LogoHeader";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const navigate = useNavigate();
  const [traderCount, setTraderCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setTraderCount(count ?? 0));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-secondary"
        >
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
          <span className="text-xs font-medium text-muted-foreground">
            {traderCount === null
              ? "…"
              : traderCount === 0
              ? "Be the first trader to join"
              : `${traderCount.toLocaleString()} traders onboard`}
          </span>
        </motion.div>

        {/* Globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <AnimatedGlobe />
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6"
        >
          <LogoHeader />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-4 text-center text-sm leading-relaxed text-muted-foreground max-w-xs"
        >
          Structured accountability for serious traders. One partner, daily check-ins, real results.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-8 w-full max-w-xs flex flex-col gap-3"
        >
          <Button
            onClick={() => navigate("/signup")}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-sm font-semibold"
          >
            Create account
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button
            onClick={() => navigate("/signin")}
            variant="outline"
            className="w-full border-border text-foreground hover:bg-secondary h-12 text-sm font-semibold"
          >
            Sign in
          </Button>
        </motion.div>
      </div>

      <MarqueeFooter />
    </div>
  );
};

export default Landing;
