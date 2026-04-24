import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  /** Optional: hide the top header on pages that render their own */
  hideHeader?: boolean;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen max-w-[935px] mx-auto w-full">
        {children}
        {/* Safe-area spacer so content never hides behind the mobile bottom nav */}
        <div
          className="lg:hidden shrink-0"
          style={{ height: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
          aria-hidden
        />
      </main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
