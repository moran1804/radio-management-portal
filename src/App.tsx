import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StationConfigProvider, useStationConfig } from "@/hooks/useStationConfig";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";
import { SetupWizard } from "@/components/SetupWizard";
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
import Jingles from "./pages/Jingles";
import Help from "./pages/Help";
import Settings from "./pages/Settings";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AppContent = () => {
  const { loading, isFirstRun } = useStationConfig();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isFirstRun) {
    return <SetupWizard />;
  }

  return (
    <>
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
        <Route path="/jingles" element={<Jingles />} />
        <Route path="/help" element={<Help />} />
        <Route path="/settings" element={<Settings />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StationConfigProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </StationConfigProvider>
  </QueryClientProvider>
);

export default App;
