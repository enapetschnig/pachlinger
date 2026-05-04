import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingContextType {
  showInstallDialog: boolean;
  setShowInstallDialog: (show: boolean) => void;
  handleRestartInstallGuide: () => void;
  handleInstallDialogClose: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = "pachlinger_install_dialog_seen";
const SESSION_KEY = "pachlinger_install_dialog_session_shown";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN") return;
      if (sessionStorage.getItem(SESSION_KEY) === "true") return;
      if (localStorage.getItem(STORAGE_KEY) === "true") return;
      sessionStorage.setItem(SESSION_KEY, "true");
      setShowInstallDialog(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRestartInstallGuide = () => setShowInstallDialog(true);

  const handleInstallDialogClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowInstallDialog(false);
  };

  return (
    <OnboardingContext.Provider
      value={{ showInstallDialog, setShowInstallDialog, handleRestartInstallGuide, handleInstallDialogClose }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
  return context;
}
