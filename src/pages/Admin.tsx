import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserCheck, Trash2, KeyRound, UserX, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmailSettingsCard } from "@/components/admin/EmailSettingsCard";

type Role = "administrator" | "mitarbeiter";

type Profile = {
  id: string;
  vorname: string;
  nachname: string;
  is_active: boolean;
  created_at: string;
};

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("id, vorname, nachname, is_active, created_at")
      .order("created_at", { ascending: false });

    if (profileErr) {
      toast({ variant: "destructive", title: "Fehler", description: profileErr.message });
      return;
    }

    const { data: roleData } = await supabase.from("user_roles").select("user_id, role");

    const roleMap: Record<string, Role> = {};
    (roleData ?? []).forEach((r) => {
      roleMap[r.user_id] = r.role as Role;
    });

    setProfiles((profileData ?? []) as Profile[]);
    setRoles(roleMap);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      const adminCheck = roleRow?.role === "administrator";
      setIsAdmin(adminCheck);
      if (!adminCheck) {
        setLoading(false);
        return;
      }
      await loadData();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const activate = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ is_active: true }).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Fehler", description: error.message });
      return;
    }
    toast({ title: "Aktiviert" });
    await loadData();
  };

  const deactivate = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Fehler", description: error.message });
      return;
    }
    toast({ title: "Deaktiviert" });
    await loadData();
  };

  const changeRole = async (userId: string, newRole: Role) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) {
      toast({ variant: "destructive", title: "Fehler", description: delErr.message });
      return;
    }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (insErr) {
      toast({ variant: "destructive", title: "Fehler", description: insErr.message });
      return;
    }
    toast({ title: "Rolle geändert", description: newRole });
    await loadData();
  };

  const sendPasswordReset = async (userId: string) => {
    const { data: email, error } = await supabase.rpc("admin_get_user_email", { _uid: userId });
    if (error || !email) {
      toast({ variant: "destructive", title: "Fehler", description: error?.message ?? "E-Mail nicht gefunden" });
      return;
    }
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (resetErr) {
      toast({ variant: "destructive", title: "Fehler", description: resetErr.message });
      return;
    }
    toast({ title: "Reset-Link gesendet", description: email });
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.rpc("admin_delete_user", { _uid: id });
    if (error) {
      toast({ variant: "destructive", title: "Fehler", description: error.message });
      return;
    }
    toast({ title: "Benutzer gelöscht" });
    setConfirmDeleteId(null);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Lädt...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Admin" />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Kein Zugriff</CardTitle>
              <CardDescription>Sie sind nicht berechtigt, diese Seite zu sehen.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  const pending = profiles.filter((p) => !p.is_active);
  const activeProfiles = profiles.filter((p) => p.is_active);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mitarbeiterverwaltung" />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6">
        <EmailSettingsCard />

        {pending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Wartende Aktivierungen
              </CardTitle>
              <CardDescription>
                {pending.length} {pending.length === 1 ? "Person wartet" : "Personen warten"} auf Freischaltung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback>{(p.vorname[0] ?? "?") + (p.nachname[0] ?? "")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {p.vorname} {p.nachname}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registriert: {new Date(p.created_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" onClick={() => activate(p.id)}>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Freischalten
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Aktive Benutzer
            </CardTitle>
            <CardDescription>
              {activeProfiles.length} {activeProfiles.length === 1 ? "aktiver Benutzer" : "aktive Benutzer"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Noch keine aktiven Benutzer.</p>
            ) : (
              activeProfiles.map((p) => {
                const role = roles[p.id] ?? "mitarbeiter";
                return (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback>{(p.vorname[0] ?? "?") + (p.nachname[0] ?? "")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">
                            {p.vorname} {p.nachname}
                          </p>
                          <Badge variant={role === "administrator" ? "default" : "secondary"}>
                            {role === "administrator" ? "Administrator" : "Mitarbeiter"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Select value={role} onValueChange={(v) => changeRole(p.id, v as Role)}>
                        <SelectTrigger className="h-9 w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mitarbeiter">Mitarbeiter</SelectItem>
                          <SelectItem value="administrator">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => sendPasswordReset(p.id)}>
                        <KeyRound className="h-4 w-4 mr-1" />
                        Passwort
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deactivate(p.id)}>
                        <UserX className="h-4 w-4 mr-1" />
                        Deaktivieren
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Benutzer und sein Profil werden permanent gelöscht. Alle vom Benutzer erstellten
              Lieferscheine bleiben erhalten und können vom Administrator weiter bearbeitet werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && deleteUser(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
