import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Partners from "./pages/Partners";
import WaitingList from "./pages/WaitingList";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import PulseSession from "./pages/PulseSession";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ViewProfile from "./pages/ViewProfile";
import TradingLog from "./pages/TradingLog";
import Saved from "./pages/Saved";
import MatchProfile from "./pages/MatchProfile";
import Diagnostics from "./pages/Diagnostics";
import AdminUsers from "./pages/AdminUsers";
import AdminBroadcast from "./pages/AdminBroadcast";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Install from "./pages/Install";
import EnableNotifications from "./pages/EnableNotifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s — avoid refetching on every remount
      gcTime: 5 * 60_000,          // keep cached data 5 min after unmount
      refetchOnWindowFocus: false, // don't re-hit DB every tab focus
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/waiting-list" element={<WaitingList />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/pulse/session/:id" element={<PulseSession />} />
          <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile/:userId" element={<ViewProfile />} />
          <Route path="/trading-log" element={<TradingLog />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/match/:userId" element={<MatchProfile />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/broadcast" element={<AdminBroadcast />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/install" element={<Install />} />
          <Route path="/enable-notifications" element={<EnableNotifications />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
