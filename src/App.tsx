import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

import Users from "./pages/Users";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";
import Calendar from "./pages/Calendar";
import DJProfile from "./pages/DJProfile";
import DJDashboardPage from "./pages/DJDashboard";
import RecurringSlotsPage from "./pages/RecurringSlots";
import Schedule from "./pages/Schedule";
import Jobs from "./pages/Jobs";
import ShowRunnerStatus from "./pages/ShowRunnerStatus";
import LiveControlRoom from "./pages/LiveControlRoom";
import Prerecord from "./pages/Prerecord";
import ShowRecordings from "./pages/ShowRecordings";
import Jingles from "./pages/Jingles";
import Help from "./pages/Help";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProfileCompletionDialog />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            <Route path="/users" element={<Users />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/calendar" element={<Calendar />} />
          <Route path="/dj-profile" element={<DJProfile />} />
          <Route path="/dj-dashboard" element={<DJDashboardPage />} />
          <Route path="/recurring-slots" element={<RecurringSlotsPage />} />
        <Route path="/schedule" element={<Schedule />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/show-runner-status" element={<ShowRunnerStatus />} />
            <Route path="/live-control-room" element={<LiveControlRoom />} />
            <Route path="/prerecord" element={<Prerecord />} />
            <Route path="/show-recordings" element={<ShowRecordings />} />
            <Route path="/jingles" element={<Jingles />} />
            <Route path="/help" element={<Help />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
