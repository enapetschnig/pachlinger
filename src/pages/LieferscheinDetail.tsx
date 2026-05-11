import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Trash2, Download, PenLine, ArrowLeft, Mail } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  LieferscheinWithPositions,
  deleteLieferschein,
  downloadLieferscheinPdf,
  formatDateDe,
  getLieferschein,
  getSignatureUrl,
  statusLabel,
} from "@/lib/lieferschein";
import { SignatureCaptureDialog } from "@/components/lieferschein/SignatureCaptureDialog";
import { SendEmailDialog } from "@/components/lieferschein/SendEmailDialog";

export default function LieferscheinDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { toast } = useToast();
  const [ls, setLs] = useState<LieferscheinWithPositions | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [creatorName, setCreatorName] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      const data = await getLieferschein(id);
      if (!data) {
        toast({ variant: "destructive", title: "Lieferschein nicht gefunden" });
        navigate("/lieferscheine");
        return;
      }
      setLs(data);

      if (data.unterschrift_image_url) {
        const url = await getSignatureUrl(data.unterschrift_image_url);
        setSignatureUrl(url);
      } else {
        setSignatureUrl(null);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsOwner(data.user_id === user.id);
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        const adminCheck = roleRow?.role === "administrator";
        setIsAdmin(adminCheck);

        if (adminCheck && data.user_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("vorname, nachname")
            .eq("id", data.user_id)
            .maybeSingle();
          if (prof) setCreatorName(`${prof.vorname} ${prof.nachname}`.trim());
        }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Wizard-Flow: nach Lieferschein-Erstellung wird mit state.openSignAfterCreate
  // hierher navigiert -> SignatureCaptureDialog direkt öffnen.
  useEffect(() => {
    const state = location.state as { openSignAfterCreate?: boolean } | null;
    if (state?.openSignAfterCreate) {
      setSignOpen(true);
      // History-State leeren, damit Reload nicht erneut triggert
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteLieferschein(id);
      toast({ title: "Gelöscht" });
      navigate("/lieferscheine");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    }
  };

  const handleDownloadPdf = async () => {
    if (!ls) return;
    setDownloading(true);
    try {
      await downloadLieferscheinPdf(ls.id);
    } catch (e: any) {
      toast({ variant: "destructive", title: "PDF-Fehler", description: e.message });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Lädt...</p>
      </div>
    );
  }

  if (!ls) return null;

  const canEdit = isAdmin || (isOwner && ls.status === "entwurf");
  const canDelete = canEdit;
  const canSign = (isOwner || isAdmin) && ls.status !== "unterschrieben";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={ls.nummer} backPath="/lieferscheine" />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-4xl space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadPdf} disabled={downloading}>
            <Download className="h-4 w-4 mr-2" />
            {downloading ? "Erstellt..." : "PDF herunterladen"}
          </Button>
          <Button variant="outline" onClick={() => setSendEmailOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Per E-Mail senden
          </Button>
          {canSign && (
            <Button variant="outline" onClick={() => setSignOpen(true)}>
              <PenLine className="h-4 w-4 mr-2" />
              Unterschreiben
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/lieferscheine/${ls.id}/bearbeiten`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-2xl font-mono text-primary">{ls.nummer}</CardTitle>
              <Badge variant={ls.status === "entwurf" ? "outline" : ls.status === "unterschrieben" ? "default" : "secondary"}>
                {statusLabel(ls.status)}
              </Badge>
            </div>
            {creatorName && (
              <p className="text-sm text-muted-foreground">Erstellt von {creatorName}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Datum</p>
                <p className="font-medium">{formatDateDe(ls.lieferschein_datum)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kundennummer</p>
                <p className="font-medium">{ls.kunden_nummer || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Leistung</p>
                <p className="font-medium">{ls.leistung || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">UID</p>
                <p className="font-medium">{ls.empfaenger_uid || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Empfänger</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{ls.empfaenger_name}</p>
            {ls.empfaenger_strasse && <p>{ls.empfaenger_strasse}</p>}
            {(ls.empfaenger_plz || ls.empfaenger_ort) && (
              <p>
                {[ls.empfaenger_plz, ls.empfaenger_ort].filter(Boolean).join(" ")}
              </p>
            )}
          </CardContent>
        </Card>

        {(ls.betreff || ls.angebot_nr || ls.bauseits.length > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Betreff & Vorbedingungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ls.betreff && (
                <div>
                  <p className="text-xs text-muted-foreground">Betreff</p>
                  <p className="font-semibold">{ls.betreff}</p>
                </div>
              )}
              {ls.angebot_nr && (
                <div>
                  <p className="text-xs text-muted-foreground">Angebot</p>
                  <p>
                    {ls.angebot_nr}
                    {ls.angebot_datum ? ` vom ${formatDateDe(ls.angebot_datum)}` : ""}
                  </p>
                </div>
              )}
              {ls.bauseits.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Bauseits</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {ls.bauseits.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Positionen</CardTitle>
          </CardHeader>
          <CardContent>
            {ls.positionen.length === 0 ? (
              <p className="text-muted-foreground text-sm">Keine Positionen</p>
            ) : (
              <div className="space-y-1">
                {ls.positionen.map((p) => (
                  <div key={p.id ?? p.pos_nr} className="flex items-start gap-3 py-2 border-b last:border-b-0">
                    <span className="font-mono text-sm w-6 shrink-0">{p.pos_nr}</span>
                    <span className="font-mono text-sm w-16 text-right shrink-0">
                      {Number(p.menge).toLocaleString("de-DE", { maximumFractionDigits: 3 })}
                    </span>
                    <span className="text-sm w-12 shrink-0">{p.einheit}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold whitespace-pre-wrap">{p.bezeichnung}</p>
                      {p.rabatt_eur !== null && p.rabatt_eur !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Rabatt EUR{" "}
                          {Number(p.rabatt_eur).toLocaleString("de-DE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {ls.unterschrift_image_url && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Unterschrift</CardTitle>
            </CardHeader>
            <CardContent>
              {(ls.unterschrift_ort || ls.unterschrift_datum) && (
                <p className="text-sm mb-2">
                  {[ls.unterschrift_ort, formatDateDe(ls.unterschrift_datum)].filter(Boolean).join(", ")}
                </p>
              )}
              {signatureUrl && (
                <img src={signatureUrl} alt="Unterschrift" className="h-24 bg-white border rounded" />
              )}
            </CardContent>
          </Card>
        )}

        <div className="pt-4">
          <Button variant="ghost" onClick={() => navigate("/lieferscheine")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Liste
          </Button>
        </div>
      </main>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lieferschein wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Lieferschein {ls.nummer} und alle zugehörigen Positionen werden permanent gelöscht.
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

      {ls && (
        <SignatureCaptureDialog
          open={signOpen}
          lieferscheinId={ls.id}
          defaultOrt={ls.empfaenger_ort ?? ""}
          cancelLabel="Später unterschreiben"
          onClose={() => setSignOpen(false)}
          onSigned={async () => {
            await load();
            // Direkt zum nächsten Schritt: E-Mail-Versand
            setSendEmailOpen(true);
          }}
        />
      )}

      {ls && (
        <SendEmailDialog
          open={sendEmailOpen}
          ls={ls}
          onClose={() => setSendEmailOpen(false)}
          onSent={() => void load()}
        />
      )}
    </div>
  );
}
