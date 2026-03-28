import { ReactNode } from "react";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#07090f]">
      <div className="relative mx-auto max-w-[430px] min-h-screen bg-background flex flex-col">
        <main className="flex-1 flex flex-col min-h-screen pb-16">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
