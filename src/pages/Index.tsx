import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, UsersRound, LogOut, User as UserIcon, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOnboarding } from "@/contexts/OnboardingContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import { Logo } from "@/components/Logo";

type Role = "administrator" | "mitarbeiter" | null;

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role>(null);
  const [userName, setUserName] = useState("");
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleRestartInstallGuide } = useOnboarding();

  const loadForUser = async (userId: string) => {
    const profileReq = supabase
      .from("profiles")
      .select("vorname, nachname, is_active")
      .eq("id", userId)
      .maybeSingle();

    const roleReq = supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const [{ data: profileData }, { data: roleData }] = await Promise.all([profileReq, roleReq]);

    if (profileData) {
      setUserName(`${profileData.vorname} ${profileData.nachname}`.trim() || "Benutzer");
      setIsActive(profileData.is_active);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata as { vorname?: string; nachname?: string } | undefined;
      setUserName(`${meta?.vorname ?? ""} ${meta?.nachname ?? ""}`.trim() || "Neuer Benutzer");
      setIsActive(false);
    }

    setUserRole((roleData?.role as Role) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setIsActive(null);
        setUserRole(null);
        setUserName("");
        setLoading(false);
        navigate("/auth");
        return;
      }

      setLoading(true);
      await loadForUser(nextSession.user.id);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => void handleSession(nextSession), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      window.setTimeout(() => void handleSession(session), 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Lädt...</p>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = userRole === "administrator";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Logo size="md" />
              <div className="hidden sm:block h-8 w-px bg-border" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm text-muted-foreground">Hallo</span>
                <span className="text-sm sm:text-base font-semibold">{userName || "Benutzer"}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Menü</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mein Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRestartInstallGuide}>
                  <Info className="mr-2 h-4 w-4" />
                  <span>App zum Startbildschirm hinzufügen</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ChangePasswordDialog />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Abmelden</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {isActive === false ? (
          <Card className="max-w-xl mx-auto mt-8">
            <CardHeader>
              <CardTitle>Account noch nicht freigeschaltet</CardTitle>
              <CardDescription>
                Ihr Account muss noch von einem Administrator freigeschaltet werden, bevor Sie
                Lieferscheine erstellen können.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                {isAdmin ? "Admin Dashboard" : "Mein Dashboard"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isAdmin ? "Lieferscheine und Mitarbeiter verwalten" : "Lieferscheine erstellen und verwalten"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-4xl">
              <Card
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                onClick={() => navigate("/lieferscheine")}
              >
                <CardHeader className="space-y-2 pb-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">Lieferscheine</CardTitle>
                  <CardDescription className="text-sm">
                    {isAdmin
                      ? "Alle Lieferscheine ansehen und bearbeiten"
                      : "Lieferscheine erstellen und ansehen"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="sm">Öffnen</Button>
                </CardContent>
              </Card>

              {isAdmin && (
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                  onClick={() => navigate("/kunden")}
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <UsersRound className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl">Kunden</CardTitle>
                    <CardDescription className="text-sm">
                      Stammdaten verwalten & importieren
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" size="sm" variant="outline">Öffnen</Button>
                  </CardContent>
                </Card>
              )}

              {isAdmin && (
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                  onClick={() => navigate("/admin")}
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="h-12 w-12 rounded-lg bg-pachlinger-orange/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-pachlinger-orange" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl">Mitarbeiter</CardTitle>
                    <CardDescription className="text-sm">
                      Benutzerverwaltung & Freischaltungen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" size="sm" variant="outline">Verwalten</Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="mt-8 text-center text-xs text-muted-foreground">
              <p>Pachlinger GmbH · Teuffenbachstr. 21 · 8833 Teufenbach-Katsch</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
