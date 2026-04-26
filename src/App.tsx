import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import ViewProfile from "./pages/ViewProfile";
import TradingLog from "./pages/TradingLog";
import Saved from "./pages/Saved";
import MatchProfile from "./pages/MatchProfile";
import Diagnostics from "./pages/Diagnostics";
import AdminUsers from "./pages/AdminUsers";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<ViewProfile />} />
          <Route path="/trading-log" element={<TradingLog />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/match/:userId" element={<MatchProfile />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
