import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import RouteSkeleton from "@/components/RouteSkeleton";

// Eager: landing/auth (first paint matters most)
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";

// Lazy: everything else — keeps initial bundle small
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const Partners = lazy(() => import("./pages/Partners"));
const WaitingList = lazy(() => import("./pages/WaitingList"));
const Feed = lazy(() => import("./pages/Feed"));
const Messages = lazy(() => import("./pages/Messages"));
const PulseSession = lazy(() => import("./pages/PulseSession"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const ViewProfile = lazy(() => import("./pages/ViewProfile"));
const TradingLog = lazy(() => import("./pages/TradingLog"));
const Saved = lazy(() => import("./pages/Saved"));
const MatchProfile = lazy(() => import("./pages/MatchProfile"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminBroadcast = lazy(() => import("./pages/AdminBroadcast"));
const AdminBetaInvites = lazy(() => import("./pages/AdminBetaInvites"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Install = lazy(() => import("./pages/Install"));
const EnableNotifications = lazy(() => import("./pages/EnableNotifications"));
const Room = lazy(() => import("./pages/Room"));

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
        <Suspense fallback={<RouteSkeleton />}>
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
          <Route path="/admin/beta-invites" element={<AdminBetaInvites />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/install" element={<Install />} />
          <Route path="/enable-notifications" element={<EnableNotifications />} />
          <Route path="/threads" element={<Navigate to="/feed" replace />} />
          <Route path="/rooms" element={<Navigate to="/feed" replace />} />
          <Route path="/rooms/:id" element={<Room />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
