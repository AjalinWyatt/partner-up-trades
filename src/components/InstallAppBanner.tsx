import { useEffect, useState } from "react";
import { Smartphone, Apple, Download, X, Share, Plus, ChevronRight, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Platform = "ios" | "android" | "desktop";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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

const DISMISS_KEY = "tw_install_banner_dismissed_at";
const DISMISS_DAYS = 7;

function isRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallAppBanner() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (isRecentlyDismissed()) return;
    setPlatform(detectPlatform());
    setVisible(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
    setVisible(false);
  };

  const handlePrimary = async () => {
    if (platform === "android" && deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      setDeferred(null);
      return;
    }
    setShowHowTo(true);
  };

  if (!visible) return null;

  const config = {
    ios: {
      icon: <Apple className="w-4 h-4" />,
      label: "Add TradersWorld to your iPhone",
      cta: "Show me how",
    },
    android: {
      icon: <Smartphone className="w-4 h-4" />,
      label: "Install TradersWorld on Android",
      cta: deferred ? "Install" : "Show me how",
    },
    desktop: {
      icon: <QrCode className="w-4 h-4" />,
      label: "Get TradersWorld on your phone",
      cta: "Show me how",
    },
  }[platform];

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md">
        <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl p-3 pl-4 flex items-center gap-3">
          <img
            src="/favicon.png"
            alt=""
            width={40}
            height={40}
            className="rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight truncate">
              {config.label}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              Full-screen, push notifications, one-tap access.
            </p>
          </div>
          <button
            onClick={handlePrimary}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold whitespace-nowrap"
          >
            {platform === "android" && deferred ? (
              <Download className="w-3.5 h-3.5" />
            ) : (
              config.icon
            )}
            {config.cta}
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 p-1.5 -mr-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Dialog open={showHowTo} onOpenChange={setShowHowTo}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm p-0 overflow-hidden">
          <DialogTitle className="sr-only">Install TradersWorld</DialogTitle>
          <HowToContent platform={platform} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function HowToContent({ platform }: { platform: Platform }) {
  if (platform === "ios") return <IosHowTo />;
  if (platform === "android") return <AndroidHowTo />;
  return <DesktopHowTo />;
}

function StepRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[12px]">
        {n}
      </div>
      <p className="text-[13px] text-foreground leading-relaxed pt-0.5">{children}</p>
    </div>
  );
}

function IosHowTo() {
  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <img src="/favicon.png" alt="" width={44} height={44} className="rounded-xl" />
        <div>
          <p className="text-[15px] font-bold">Add to your iPhone</p>
          <p className="text-[11px] text-muted-foreground">Takes about 10 seconds</p>
        </div>
      </div>

      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 mb-4">
        <p className="text-[12px] text-foreground">
          ⚠️ Must be in <strong>Safari</strong> — not Chrome or Instagram's in-app browser.
        </p>
      </div>

      <div className="space-y-3">
        <StepRow n={1}>
          Tap the <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary border border-border font-medium"><Share className="w-3 h-3" />Share</span> button at the bottom of Safari.
        </StepRow>
        <StepRow n={2}>
          Scroll and tap <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary border border-border font-medium"><Plus className="w-3 h-3" />Add to Home Screen</span>.
        </StepRow>
        <StepRow n={3}>
          Tap <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary border border-border font-medium">Add</span> in the top-right corner. Done ✓
        </StepRow>
      </div>
    </div>
  );
}

function AndroidHowTo() {
  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <img src="/favicon.png" alt="" width={44} height={44} className="rounded-xl" />
        <div>
          <p className="text-[15px] font-bold">Install on Android</p>
          <p className="text-[11px] text-muted-foreground">Works in Chrome</p>
        </div>
      </div>
      <div className="space-y-3">
        <StepRow n={1}>
          Tap the <strong>⋮ menu</strong> in the top-right of Chrome.
        </StepRow>
        <StepRow n={2}>
          Tap <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary border border-border font-medium"><Download className="w-3 h-3" />Install app</span> (or "Add to Home screen").
        </StepRow>
        <StepRow n={3}>
          Tap <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary border border-border font-medium">Install</span> to confirm. Done ✓
        </StepRow>
      </div>
    </div>
  );
}

function DesktopHowTo() {
  const url = "tradersworld.app";
  // Use a free QR code generator (no key, no tracking)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=https%3A%2F%2F${url}`;
  return (
    <div className="p-5 text-center">
      <p className="text-[15px] font-bold mb-1">Get it on your phone</p>
      <p className="text-[12px] text-muted-foreground mb-4">
        Scan this with your phone camera, then add it to your home screen.
      </p>
      <div className="mx-auto w-fit p-3 rounded-2xl bg-white">
        <img src={qrSrc} alt={`QR code for ${url}`} width={220} height={220} />
      </div>
      <p className="text-[13px] font-mono text-foreground mt-4">{url}</p>
      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        On your phone, tap the share icon → <strong>Add to Home Screen</strong> (iPhone) or the menu →{" "}
        <strong>Install app</strong> (Android).
      </p>
    </div>
  );
}
