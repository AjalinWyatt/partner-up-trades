import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ArrowLeft, X } from "lucide-react";
import Wordmark from "@/components/Wordmark";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hybrid post-onboarding walkthrough:
 *  - Step 0: full-screen welcome slide
 *  - Steps 1..N: spotlight tooltips on real DOM elements (data-tour="<key>")
 */

type Step = {
  target?: string; // data-tour key; omit for welcome slide
  title: string;
  body: string;
  /** Optional route to navigate to before showing this step */
  route?: string;
};

const STEPS: Step[] = [
  {
    title: "Welcome to TradersWorld 👋🏽",
    body:
      "You're in. Quick 60-second tour so you know where everything lives — then we'll get out of your way.",
  },
  { target: "nav-home", title: "Home", body: "Your stats, streaks and notifications all live here.", route: "/dashboard" },
  { target: "nav-discover", title: "Discover", body: "Find traders matched to your style. Save the ones you vibe with — they'll see it too.", route: "/dashboard" },
  { target: "nav-feed", title: "Feed", body: "Photos, videos and stories from the community. Share wins, setups and lessons.", route: "/dashboard" },
  { target: "nav-messages", title: "Messages", body: "Once you match, this is where you talk strategy, voice notes and check-ins.", route: "/dashboard" },
  { target: "nav-log", title: "Trading Log", body: "Log every trade. Builds your streak and helps your partner keep you accountable.", route: "/dashboard" },
  { target: "nav-partners", title: "Partners", body: "Send & manage partner requests here. Up to 3 active partners on free.", route: "/dashboard" },
  { target: "nav-profile", title: "Profile", body: "That's you. Customise it so the right traders save you back.", route: "/dashboard" },
];

const PADDING = 8;

export default function Walkthrough({ onClose }: { onClose: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const step = STEPS[stepIdx];
  const isWelcome = !step.target;

  // Navigate to the step's route before measuring
  useEffect(() => {
    if (step.route && window.location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure target element
  useLayoutEffect(() => {
    if (isWelcome) {
      setRect(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        // retry next frame – nav may not have mounted yet
        raf = requestAnimationFrame(measure);
      }
    };
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [stepIdx, isWelcome, step.target]);

  const finish = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("profiles").update({ tour_completed: true }).eq("id", session.user.id);
    }
    onClose();
  };

  const next = () => {
    if (stepIdx >= STEPS.length - 1) finish();
    else setStepIdx((i) => i + 1);
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  // Position tooltip near rect
  const tooltipStyle: React.CSSProperties = (() => {
    if (!rect) return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipW = Math.min(320, vw - 24);
    const spaceRight = vw - rect.right;
    const spaceBelow = vh - rect.bottom;
    // Sidebar is on the left: prefer right placement; bottom nav: prefer above
    if (spaceRight > tooltipW + 24) {
      return { top: Math.max(12, rect.top), left: rect.right + 16, width: tooltipW };
    }
    if (spaceBelow > 220) {
      return { top: rect.bottom + 12, left: Math.max(12, Math.min(vw - tooltipW - 12, rect.left)), width: tooltipW };
    }
    return { bottom: vh - rect.top + 12, left: Math.max(12, Math.min(vw - tooltipW - 12, rect.left - tooltipW / 2 + rect.width / 2)), width: tooltipW };
  })();

  const node = (
    <div className="fixed inset-0 z-[100]">
      {isWelcome ? (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center px-6">
          <div className="max-w-sm w-full text-center">
            <div className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <Wordmark size="text-2xl" />
            <h2 className="text-foreground text-[22px] font-bold mt-5">{step.title}</h2>
            <p className="text-muted-foreground text-[14px] mt-2 leading-relaxed">{step.body}</p>
            <div className="mt-7 flex flex-col gap-2">
              <button
                onClick={next}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-[14px] flex items-center justify-center gap-2"
              >
                Take the tour <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={finish}
                className="w-full py-2.5 text-muted-foreground text-[13px] font-medium hover:text-foreground transition-colors"
              >
                Skip — I'll explore on my own
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Dimmed overlay with cut-out hole */}
          <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={next}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                {rect && (
                  <rect
                    x={rect.left - PADDING}
                    y={rect.top - PADDING}
                    width={rect.width + PADDING * 2}
                    height={rect.height + PADDING * 2}
                    rx={12}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="hsl(var(--background) / 0.78)" mask="url(#tour-mask)" />
            {rect && (
              <rect
                x={rect.left - PADDING}
                y={rect.top - PADDING}
                width={rect.width + PADDING * 2}
                height={rect.height + PADDING * 2}
                rx={12}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            )}
          </svg>

          {/* Tooltip card */}
          {rect && (
            <div
              className="fixed z-[101] rounded-2xl bg-card border border-border shadow-2xl p-4"
              style={tooltipStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <h3 className="text-foreground font-bold text-[15px]">{step.title}</h3>
                <button onClick={finish} aria-label="Skip tour" className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{step.body}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {stepIdx} / {STEPS.length - 1}
                </span>
                <div className="flex items-center gap-2">
                  {stepIdx > 1 && (
                    <button
                      onClick={back}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold flex items-center gap-1"
                  >
                    {stepIdx >= STEPS.length - 1 ? "Done" : "Next"}
                    {stepIdx < STEPS.length - 1 && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return createPortal(node, document.body);
}