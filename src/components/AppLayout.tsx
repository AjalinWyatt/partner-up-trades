import { ReactNode, useEffect, useState } from "react";
import AppSidebar from "./AppSidebar";
import BottomNav from "./BottomNav";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import Walkthrough from "./Walkthrough";

interface AppLayoutProps {
  children: ReactNode;
  /** Optional: hide the top header on pages that render their own */
  hideHeader?: boolean;
  /** Optional: hide the mobile bottom nav (e.g. inside an active chat) */
  hideBottomNav?: boolean;
  /**
   * Lock the main column to the viewport height so the page itself does not scroll.
   * The page is then responsible for providing its own internal scroll container.
   */
  lockHeight?: boolean;
}

export default function AppLayout({ children, hideBottomNav, lockHeight }: AppLayoutProps) {
  usePresenceHeartbeat();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const check = () => {
      if (sessionStorage.getItem("tw:tour-active") === "1") setShowTour(true);
    };
    check();
    window.addEventListener("tw:start-tour", check);
    return () => window.removeEventListener("tw:start-tour", check);
  }, []);

  return (
    <div className={`flex w-full overflow-x-hidden bg-background ${lockHeight ? "h-[100dvh] overflow-hidden" : "min-h-screen"}`}>
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Main content */}
      <main
        className={`flex-1 flex flex-col max-w-[935px] mx-auto w-full min-w-0 overflow-x-hidden ${
          lockHeight ? "h-[100dvh] overflow-hidden" : "min-h-screen"
        }`}
      >
        {children}
        {/* Safe-area spacer so content never hides behind the mobile bottom nav */}
        {!hideBottomNav && !lockHeight && (
          <div
            className="lg:hidden shrink-0"
            style={{ height: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
            aria-hidden
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      {!hideBottomNav && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}

      {showTour && (
        <Walkthrough
          onClose={() => {
            sessionStorage.removeItem("tw:tour-active");
            setShowTour(false);
          }}
        />
      )}
    </div>
  );
}
