import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Apple, Smartphone, Bell, Settings as SettingsIcon, ChevronRight, Check, ChevronUp } from "lucide-react";
import Wordmark from "@/components/Wordmark";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function readPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return (Notification.permission as PermissionState) || "default";
}

export default function EnableNotifications() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>("ios");
  const [installed, setInstalled] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    setPermission(readPermission());

    // Re-check when user returns from Settings (deep-link back)
    const onVisible = () => {
      if (document.visibilityState === "visible") setPermission(readPermission());
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
    } finally {
      setRequesting(false);
    }
  };

  const finish = () => navigate("/dashboard");

  const granted = permission === "granted";
  const denied = permission === "denied";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 px-5 pb-4 pt-safe-4 border-b border-border">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Wordmark size="text-lg" />
      </header>

      <main className="max-w-md mx-auto px-5 py-6 pb-24">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 flex items-center justify-center mb-4 relative">
            <Bell className="w-9 h-9 text-primary" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
              3
            </span>
          </div>
          <h1 className="text-[24px] font-bold leading-tight">Turn on notifications</h1>
          <p className="text-muted-foreground text-[14px] mt-2 leading-relaxed">
            Get a heads-up when a partner sends a request, you match with someone, or a message lands —
            even when the app is closed.
          </p>
        </div>

        {/* Status card */}
        {granted && (
          <div className="mb-6 rounded-xl border border-success/40 bg-success/10 p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-success mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[14px] font-bold text-foreground">Notifications are on ✓</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                You're all set. We'll only ping you for things that matter.
              </p>
            </div>
          </div>
        )}

        {!granted && !installed && platform === "ios" && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-[13px] font-bold text-foreground">Install the app first</p>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              On iPhone, notifications only work after you've added TradersWorld to your Home Screen.
            </p>
            <button
              onClick={() => navigate("/install")}
              className="mt-3 text-[13px] font-bold text-primary inline-flex items-center gap-1"
            >
              Show me how <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Platform selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary mb-6">
          {([
            { key: "ios", label: "iPhone", icon: Apple },
            { key: "android", label: "Android", icon: Smartphone },
          ] as const).map((p) => {
            const active = platform === p.key;
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => setPlatform(p.key)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {p.label}
              </button>
            );
          })}
        </div>

        {platform === "ios" && (
          <IosNotifSteps
            permission={permission}
            requesting={requesting}
            onAsk={requestPermission}
            installed={installed}
          />
        )}
        {platform === "android" && (
          <AndroidNotifSteps
            permission={permission}
            requesting={requesting}
            onAsk={requestPermission}
            denied={denied}
          />
        )}

        {/* Finish CTA */}
        <button
          onClick={finish}
          className={`mt-6 w-full py-3 rounded-xl font-bold text-[14px] transition-colors ${
            granted
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {granted ? "Finish setup →" : "Skip for now"}
        </button>
      </main>
    </div>
  );
}

/* ---------- Step components ---------- */

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[13px]">
        {n}
      </div>
      <div className="flex-1 pb-5">
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        {children && <div className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 border-b border-white/5 last:border-b-0 ${
        highlight ? "bg-primary/15 ring-1 ring-primary/40 rounded-md -mx-1" : ""
      }`}
    >
      <span className="w-6 h-6 rounded-md bg-primary/80 text-white flex items-center justify-center">
        {icon}
      </span>
      <span className={`flex-1 text-[12px] ${highlight ? "text-white font-semibold" : "text-white/90"}`}>
        {label}
      </span>
      {value && <span className="text-[11px] text-white/60">{value}</span>}
      <ChevronRight className="w-3.5 h-3.5 text-white/40" />
    </div>
  );
}

function IosNotifSteps({
  permission,
  requesting,
  onAsk,
  installed,
}: {
  permission: PermissionState;
  requesting: boolean;
  onAsk: () => void;
  installed: boolean;
}) {
  const denied = permission === "denied";
  const granted = permission === "granted";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-bold mb-4">
        iPhone — iOS 16.4 or newer
      </p>

      {!granted && !denied && installed && (
        <button
          onClick={onAsk}
          disabled={requesting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-[14px] mb-5 disabled:opacity-60"
        >
          <Bell className="w-4 h-4" /> {requesting ? "Asking iOS…" : "Ask iOS to enable notifications"}
        </button>
      )}

      {denied && (
        <>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mb-5">
            <p className="text-[13px] font-bold text-foreground">You previously said "Don't Allow"</p>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              iOS won't let us ask again — you'll need to flip it on manually in Settings. It takes 15
              seconds.
            </p>
          </div>

          <Step n={1} title="Open the iOS Settings app">
            Grey gear icon on your home screen — not the in-app settings.
          </Step>

          <Step n={2} title='Scroll down and tap "Notifications"'>
            It's a few rows down, under General.
          </Step>

          <Step n={3} title='Find "TradersWorld" in the app list'>
            Apps are listed alphabetically. Look for our green globe icon.
          </Step>

          {/* Mock iOS Settings → Notifications row */}
          <div className="ml-10 -mt-2 mb-5">
            <div className="rounded-2xl bg-[#1c1c1e] border border-white/10 p-2 shadow-xl max-w-[280px]">
              <p className="text-white/50 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5">
                Notification Style
              </p>
              <SettingsRow
                icon={<Bell className="w-3 h-3" />}
                label="Threads"
                value="Banners"
              />
              <SettingsRow
                icon={
                  <img src="/app-icon-192.png" alt="" className="w-6 h-6 rounded-md -m-px" />
                }
                label="TradersWorld"
                value="Off"
                highlight
              />
              <SettingsRow
                icon={<Bell className="w-3 h-3" />}
                label="TV"
                value="Banners"
              />
              <p className="text-[10px] text-primary/90 mt-2 flex items-center gap-1 font-semibold px-1">
                <ChevronUp className="w-3 h-3" /> Tap TradersWorld
              </p>
            </div>
          </div>

          <Step n={4} title='Toggle "Allow Notifications" ON'>
            It's the very first row — flip the green switch on. We recommend leaving{" "}
            <strong className="text-foreground">Lock Screen</strong>,{" "}
            <strong className="text-foreground">Notification Centre</strong> and{" "}
            <strong className="text-foreground">Banners</strong> all checked.
          </Step>

          <Step n={5} title="Come back to TradersWorld">
            Swipe up to close Settings, then tap our icon — or use the button below to jump back in.
          </Step>

          <a
            href="/dashboard"
            className="mt-1 mb-2 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-[14px]"
          >
            <SettingsIcon className="w-4 h-4" /> I've enabled them — back to the app
          </a>
        </>
      )}

      {!denied && !granted && installed && (
        <>
          <Step n={1} title="Tap the button above">
            iOS will show a system pop-up asking to send notifications.
          </Step>
          <Step n={2} title='Tap "Allow"'>
            That's it — you're done. We'll only ping you for partner requests, matches and messages.
          </Step>
        </>
      )}

      {granted && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          You've already allowed notifications on this device. You can fine-tune sounds, badges and the
          lock-screen style in iOS{" "}
          <strong className="text-foreground">Settings → Notifications → TradersWorld</strong>.
        </p>
      )}
    </div>
  );
}

function AndroidNotifSteps({
  permission,
  requesting,
  onAsk,
  denied,
}: {
  permission: PermissionState;
  requesting: boolean;
  onAsk: () => void;
  denied: boolean;
}) {
  const granted = permission === "granted";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-bold mb-4">
        Android — Chrome
      </p>

      {!granted && !denied && (
        <button
          onClick={onAsk}
          disabled={requesting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-[14px] mb-5 disabled:opacity-60"
        >
          <Bell className="w-4 h-4" /> {requesting ? "Asking Android…" : "Enable notifications"}
        </button>
      )}

      {denied && (
        <>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mb-5">
            <p className="text-[13px] font-bold text-foreground">Notifications are blocked</p>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              Turn them back on from your phone's app settings.
            </p>
          </div>
          <Step n={1} title="Long-press the TradersWorld icon">
            On your home screen or app drawer, then tap <strong className="text-foreground">App info</strong> (the small ⓘ).
          </Step>
          <Step n={2} title='Tap "Notifications"'>
            Then toggle <strong className="text-foreground">All TradersWorld notifications</strong> on.
          </Step>
          <Step n={3} title="Come back to the app">
            Use the button below to finish setup.
          </Step>
          <a
            href="/dashboard"
            className="mt-1 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-[14px]"
          >
            <SettingsIcon className="w-4 h-4" /> I've enabled them — back to the app
          </a>
        </>
      )}

      {!denied && !granted && (
        <>
          <Step n={1} title="Tap the button above">
            Android will show a permission prompt.
          </Step>
          <Step n={2} title='Tap "Allow"'>
            You'll start getting push notifications for matches, messages and partner requests.
          </Step>
        </>
      )}

      {granted && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Notifications are already enabled on this device 🎉
        </p>
      )}
    </div>
  );
}
