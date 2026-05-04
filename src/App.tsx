import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OnboardingProvider, useOnboarding } from "./contexts/OnboardingContext";
import { InstallPromptDialog } from "./components/InstallPromptDialog";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Lieferscheine from "./pages/Lieferscheine";
import LieferscheinForm from "./pages/LieferscheinForm";
import LieferscheinDetail from "./pages/LieferscheinDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { showInstallDialog, handleInstallDialogClose } = useOnboarding();

  useEffect(() => {
    const ensureProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc("ensure_user_profile");
      }
    };
    ensureProfile();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/lieferscheine" element={<Lieferscheine />} />
        <Route path="/lieferscheine/neu" element={<LieferscheinForm mode="create" />} />
        <Route path="/lieferscheine/:id" element={<LieferscheinDetail />} />
        <Route path="/lieferscheine/:id/bearbeiten" element={<LieferscheinForm mode="edit" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <InstallPromptDialog open={showInstallDialog} onClose={handleInstallDialogClose} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OnboardingProvider>
          <AppContent />
        </OnboardingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
