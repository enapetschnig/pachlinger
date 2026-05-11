import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, ChevronRight, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import {
  listLieferscheine,
  statusLabel,
  formatDateDe,
  downloadLieferscheinPdf,
  Lieferschein,
} from "@/lib/lieferschein";
import { supabase } from "@/integrations/supabase/client";

export default function Lieferscheine() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<Lieferschein[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadingId) return;
    setDownloadingId(id);
    try {
      await downloadLieferscheinPdf(id);
    } catch (err: any) {
      toast({ variant: "destructive", title: "PDF-Fehler", description: err.message });
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
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
        const adminCheck = roleRow?.role === "administrator";
        if (active) setIsAdmin(adminCheck);

        const list = await listLieferscheine();
        if (!active) return;
        setItems(list);

        if (adminCheck) {
          const userIds = Array.from(new Set(list.map((l) => l.user_id).filter((u): u is string => !!u)));
          if (userIds.length > 0) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, vorname, nachname")
              .in("id", userIds);
            const map: Record<string, string> = {};
            (profs ?? []).forEach((p) => {
              map[p.id] = `${p.vorname} ${p.nachname}`.trim();
            });
            if (active) setCreators(map);
          }
        }
      } catch (e: any) {
        toast({ variant: "destructive", title: "Fehler beim Laden", description: e.message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate, toast]);

  const filtered = items.filter((l) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      l.nummer.toLowerCase().includes(s) ||
      l.empfaenger_name.toLowerCase().includes(s) ||
      (l.betreff ?? "").toLowerCase().includes(s) ||
      (l.kunden_nummer ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Lieferscheine" />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen (Nummer, Empfänger, Betreff, Kundennummer)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => navigate("/lieferscheine/neu")}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Lieferschein
          </Button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Lädt...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                {items.length === 0
                  ? "Noch keine Lieferscheine vorhanden."
                  : "Keine Lieferscheine entsprechen der Suche."}
              </p>
              {items.length === 0 && (
                <Button onClick={() => navigate("/lieferscheine/neu")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ersten Lieferschein erstellen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((l) => (
              <Card
                key={l.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/lieferscheine/${l.id}`)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm font-bold text-primary">{l.nummer}</span>
                        <Badge variant={l.status === "entwurf" ? "outline" : l.status === "unterschrieben" ? "default" : "secondary"}>
                          {statusLabel(l.status)}
                        </Badge>
                        {isAdmin && l.user_id && creators[l.user_id] && (
                          <span className="text-xs text-muted-foreground">· {creators[l.user_id]}</span>
                        )}
                      </div>
                      <p className="font-semibold truncate">{l.empfaenger_name}</p>
                      {l.betreff && <p className="text-sm text-muted-foreground truncate">{l.betreff}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{formatDateDe(l.lieferschein_datum)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={(e) => handleDownload(l.id, e)}
                      disabled={downloadingId === l.id}
                      title="PDF herunterladen"
                    >
                      {downloadingId === l.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
