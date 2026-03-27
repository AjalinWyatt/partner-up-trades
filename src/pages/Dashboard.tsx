import LogoHeader from "@/components/LogoHeader";

const Dashboard = () => (
  <div className="flex flex-col min-h-screen bg-background items-center justify-center px-6">
    <LogoHeader />
    <h1 className="text-2xl font-bold text-foreground mt-8">Dashboard</h1>
    <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
      Your trading accountability dashboard is coming soon.
    </p>
  </div>
);

export default Dashboard;
