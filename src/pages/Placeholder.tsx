import LogoHeader from "@/components/LogoHeader";
import BottomNav from "@/components/BottomNav";

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col min-h-screen bg-background items-center justify-center px-6 pb-14">
    <LogoHeader />
    <h1 className="text-2xl font-bold text-foreground mt-8">{title}</h1>
    <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">Coming soon.</p>
    <BottomNav />
  </div>
);

export default Placeholder;
