import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Onboarding from "./pages/Onboarding";
import Partners from "./pages/Partners";
import Profile from "./pages/Profile";
import ViewProfile from "./pages/ViewProfile";
import Placeholder from "./pages/Placeholder";
import Discover from "./pages/Discover";
import Messages from "./pages/Messages";
import TradingLog from "./pages/TradingLog";
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
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/view-profile" element={<ViewProfile />} />
          <Route path="/dashboard" element={<Partners />} />
          <Route path="/feed" element={<Placeholder title="Feed" />} />
          <Route path="/discover" element={<Discover />} />
           <Route path="/log" element={<TradingLog />} />
           <Route path="/messages" element={<Messages />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
