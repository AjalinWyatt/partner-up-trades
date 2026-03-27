import LogoHeader from "@/components/LogoHeader";

const Onboarding = () => (
  <div className="flex flex-col min-h-screen bg-background items-center justify-center px-6">
    <LogoHeader />
    <h1 className="text-2xl font-bold text-foreground mt-8">Welcome aboard 🎉</h1>
    <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
      Your onboarding experience is coming soon. We'll help you find your accountability partner.
    </p>
  </div>
);

export default Onboarding;
