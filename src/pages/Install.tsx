import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Apple, Smartphone, Share, Plus, MoreVertical, Download, Check, QrCode, Monitor } from "lucide-react";
import Wordmark from "@/components/Wordmark";
import appIcon from "../../public/app-icon-512.png?url";

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
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function Install() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>("ios");
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Wordmark size="text-lg" />
      </header>

      <main className="max-w-md mx-auto px-5 py-6 pb-24">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-7">
          <img
            src={appIcon}
            alt="TradersWorld app icon"
            width={88}
            height={88}
            className="rounded-2xl shadow-lg mb-4"
          />
          <h1 className="text-[24px] font-bold leading-tight">Install TradersWorld</h1>
          <p className="text-muted-foreground text-[14px] mt-2 leading-relaxed">
            Add the app to your home screen for one-tap access, full-screen experience, and push notifications.
          </p>
        </div>

        {installed && (
          <div className="mb-6 rounded-xl border border-success/40 bg-success/10 p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-success mt-0.5 shrink-0" />
            <div>
              <p className="text-[14px] font-bold text-foreground">You're already in the app ✓</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                You're using the installed version of TradersWorld. No need to install again.
              </p>
            </div>
          </div>
        )}

        {/* Platform selector */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-secondary mb-6">
          {([
            { key: "ios", label: "iPhone", icon: Apple },
            { key: "android", label: "Android", icon: Smartphone },
            { key: "desktop", label: "Desktop", icon: Monitor },
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

        {platform === "ios" && <IosSteps />}
        {platform === "android" && (
          <AndroidSteps canPrompt={!!deferred} onInstall={triggerInstall} />
        )}
        {platform === "desktop" && <DesktopSteps />}

        <div className="mt-8 rounded-xl border border-border bg-card p-4">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Tip:</strong> On a desktop right now? Open{" "}
            <span className="text-foreground font-semibold">tradersworld.app</span> in your phone's
            browser, or scan a QR code, then come back to this page.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ---------- Step components ---------- */

function Step({
  n,
  title,
  children,
  icon,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[13px]">
        {n}
      </div>
      <div className="flex-1 pb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-foreground">{title}</p>
          {icon}
        </div>
        {children && <div className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground text-[12px] font-medium">
      {children}
    </span>
  );
}

function IosSteps() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-bold mb-4">
        iPhone / iPad — Safari
      </p>
      <Step n={1} title="Open this page in Safari">
        Other browsers (Chrome, Firefox) don't support adding to home screen on iPhone — you must use Safari.
      </Step>
      <Step
        n={2}
        title="Tap the Share button"
        icon={
          <IconChip>
            <Share className="w-3.5 h-3.5" /> Share
          </IconChip>
        }
      >
        It's the square with an arrow pointing up — at the bottom of the screen on iPhone, or top-right
        on iPad.
      </Step>
      <Step
        n={3}
        title='Tap "Add to Home Screen"'
        icon={
          <IconChip>
            <Plus className="w-3.5 h-3.5" /> Add
          </IconChip>
        }
      >
        Scroll down in the share menu if you don't see it right away.
      </Step>
      <Step n={4} title='Tap "Add" to confirm'>
        TradersWorld will appear on your home screen with our app icon. Tap it to launch full-screen.
      </Step>
      <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <p className="text-[12px] text-foreground leading-relaxed">
          <strong>📲 After installing</strong>, open the app and allow notifications when prompted —
          this lets us send you new partner requests, matches, and messages.
        </p>
      </div>
    </div>
  );
}

function AndroidSteps({ canPrompt, onInstall }: { canPrompt: boolean; onInstall: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-bold mb-4">
        Android — Chrome
      </p>

      {canPrompt && (
        <button
          onClick={onInstall}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-[14px] mb-5"
        >
          <Download className="w-4 h-4" /> Install TradersWorld
        </button>
      )}

      {!canPrompt && (
        <p className="text-[12px] text-muted-foreground mb-5 -mt-2">
          Don't see a one-tap install button? Use the manual steps below.
        </p>
      )}

      <Step n={1} title="Open this page in Chrome">
        Samsung Internet and Firefox also work, but Chrome is the smoothest.
      </Step>
      <Step
        n={2}
        title="Tap the menu button"
        icon={
          <IconChip>
            <MoreVertical className="w-3.5 h-3.5" /> ⋮
          </IconChip>
        }
      >
        Three vertical dots in the top-right corner of Chrome.
      </Step>
      <Step
        n={3}
        title='Tap "Install app" or "Add to Home screen"'
        icon={
          <IconChip>
            <Download className="w-3.5 h-3.5" /> Install
          </IconChip>
        }
      >
        The wording depends on your Chrome version — both do the same thing.
      </Step>
      <Step n={4} title='Tap "Install" to confirm'>
        TradersWorld will install like a native app — full-screen, with our icon on your home screen and app drawer.
      </Step>
      <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <p className="text-[12px] text-foreground leading-relaxed">
          <strong>🔔 After installing</strong>, open the app and allow notifications. You'll get
          partner requests, matches, and messages just like a native app.
        </p>
      </div>
    </div>
  );
}

function DesktopSteps() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-bold mb-4">
        Desktop — Chrome / Edge
      </p>
      <Step n={1} title="Look for the install icon in the address bar">
        On Chrome or Edge, you'll see a small computer-with-arrow icon at the right end of the URL bar.
      </Step>
      <Step n={2} title='Click it, then click "Install"'>
        TradersWorld will open in its own window like a desktop app.
      </Step>
      <Step n={3} title="Open it from your dock or Start menu" icon={<QrCode className="w-3.5 h-3.5 text-muted-foreground" />}>
        For the best experience, we recommend installing on your phone too — the mobile design is built for one-handed use during the trading day.
      </Step>
    </div>
  );
}