import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Plus,
  Search,
  Sparkles,
  UsersRound,
  Trash2,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { listKunden, deleteKunde, Kunde } from "@/lib/kunden";
import { supabase } from "@/integrations/supabase/client";
import { KundeForm } from "@/components/kunden/KundeForm";
import { KundenImportSheet } from "@/components/kunden/KundenImportSheet";

export default function Kunden() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<Kunde[]>([]);
  const [search, setSearch] = useState("");
  const [editKunde, setEditKunde] = useState<Kunde | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await listKunden();
      setItems(data);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler beim Laden", description: e.message });
    }
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
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteKunde(confirmDeleteId);
      toast({ title: "Kunde gelöscht" });
      setConfirmDeleteId(null);
      await load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    }
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
        <PageHeader title="Kunden" />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Diese Seite ist nur für Administratoren zugänglich.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const filtered = items.filter((k) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      k.name.toLowerCase().includes(s) ||
      (k.kunden_nummer ?? "").toLowerCase().includes(s) ||
      (k.ort ?? "").toLowerCase().includes(s) ||
      (k.uid_nummer ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Kunden" />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen (Name, Kundennummer, Ort, UID)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowImport(true)}
            className="sm:w-auto"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Import mit KI
          </Button>
          <Button
            onClick={() => {
              setEditKunde(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kunde
          </Button>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                {items.length === 0
                  ? "Noch keine Kunden vorhanden."
                  : "Keine Kunden entsprechen der Suche."}
              </p>
              {items.length === 0 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    onClick={() => {
                      setEditKunde(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ersten Kunden anlegen
                  </Button>
                  <Button variant="outline" onClick={() => setShowImport(true)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Mit KI importieren
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((k) => (
              <Card
                key={k.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setEditKunde(k);
                  setShowForm(true);
                }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{k.name}</p>
                        {k.kunden_nummer && (
                          <span className="text-xs font-mono text-muted-foreground">
                            #{k.kunden_nummer}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {[k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")]
                          .filter((p) => p && p.length > 0)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditKunde(k);
                        setShowForm(true);
                      }}
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(k.id);
                      }}
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Neuer / Bearbeiten */}
      <Sheet
        open={showForm}
        onOpenChange={(o) => {
          if (!o) {
            setShowForm(false);
            setEditKunde(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editKunde ? "Kunde bearbeiten" : "Neuer Kunde"}</SheetTitle>
            <SheetDescription>
              {editKunde ? "Daten anpassen und speichern." : "Alle Felder optional außer Name."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <KundeForm
              kunde={editKunde}
              onSaved={async () => {
                setShowForm(false);
                setEditKunde(null);
                await load();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditKunde(null);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Import */}
      <Sheet open={showImport} onOpenChange={setShowImport}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Kunden mit KI importieren</SheetTitle>
            <SheetDescription>
              Füge Freitext ein, lade CSV/Excel/PDF hoch oder fotografiere eine Liste.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <KundenImportSheet
              onDone={async () => {
                setShowImport(false);
                await load();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Kunde wird permanent gelöscht. Bestehende Lieferscheine bleiben erhalten — die
              Verknüpfung wird auf "kein Kunde" gesetzt, der Empfänger-Snapshot bleibt unverändert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
