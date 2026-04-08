import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Download, HardDrive, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

type BackupSection = "mitarbeiter" | "projekte" | "regieberichte" | "za_korrekturen";

const sectionLabels: Record<BackupSection, string> = {
  mitarbeiter: "Mitarbeiter (Stammdaten, Stunden, Dokumente)",
  projekte: "Projekte (Stunden, Materialien, Pläne, Fotos)",
  regieberichte: "Arbeitsberichte (inkl. Fotos)",
  za_korrekturen: "ZA-Korrekturen",
};

export default function BackupSectionComponent() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [sections, setSections] = useState<Record<BackupSection, boolean>>({
    mitarbeiter: true,
    projekte: true,
    regieberichte: true,
    za_korrekturen: true,
  });

  const downloadStorageFiles = async (zip: JSZip, bucket: string, folder: string, zipPath: string) => {
    const { data: files } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (!files?.length) return;
    for (const file of files) {
      if (file.id === null) {
        await downloadStorageFiles(zip, bucket, `${folder}/${file.name}`, `${zipPath}/${file.name}`);
        continue;
      }
      try {
        const { data } = await supabase.storage.from(bucket).download(`${folder}/${file.name}`);
        if (data) zip.file(`${zipPath}/${file.name}`, data);
      } catch { /* skip failed files */ }
    }
  };

  const sheetFromData = (data: Record<string, unknown>[]) => {
    if (!data.length) return XLSX.utils.aoa_to_sheet([["Keine Daten"]]);
    return XLSX.utils.json_to_sheet(data);
  };

  const createWorkbook = (sheetName: string, data: Record<string, unknown>[]) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromData(data), sheetName);
    return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  };

  const runBackup = useCallback(async () => {
    setRunning(true);
    setProgress(0);
    const zip = new JSZip();
    const today = new Date().toISOString().slice(0, 10);
    const root = `backup_${today}`;
    let step = 0;
    const totalSteps = Object.values(sections).filter(Boolean).length * 3;
    const tick = (text: string) => {
      step++;
      setProgress(Math.min(Math.round((step / totalSteps) * 100), 99));
      setStatusText(text);
    };

    try {
      const { data: profiles } = await supabase.from("profiles").select("id, vorname, nachname");
      const profileMap = new Map((profiles || []).map(p => [p.id, `${p.nachname}_${p.vorname}`]));

      if (sections.mitarbeiter) {
        tick("Lade Mitarbeiterdaten...");
        const { data: employees } = await supabase.from("employees").select("*");
        const { data: allEntries } = await supabase.from("time_entries").select("*").order("datum");

        if (employees) {
          for (const emp of employees) {
            const name = `${emp.nachname}_${emp.vorname}`.replace(/[/\\?%*:|"<>]/g, "_");
            const empPath = `${root}/mitarbeiter/${name}`;

            const stamm = { ...emp };
            delete (stamm as any).id;
            zip.file(`${empPath}/stammdaten.xlsx`, createWorkbook("Stammdaten", [stamm]));

            if (emp.user_id && allEntries) {
              const entries = allEntries.filter(e => e.user_id === emp.user_id);
              if (entries.length) {
                zip.file(`${empPath}/stunden.xlsx`, createWorkbook("Stunden", entries));
              }
            }

            if (emp.user_id) {
              tick(`Lade Dokumente für ${emp.vorname} ${emp.nachname}...`);
              await downloadStorageFiles(zip, "employee-documents", `${emp.user_id}/krankmeldung`, `${empPath}/krankmeldungen`);
              await downloadStorageFiles(zip, "employee-documents", `${emp.user_id}/lohnzettel`, `${empPath}/lohnzettel`);
            }
          }
        }
      }

      if (sections.projekte) {
        tick("Lade Projektdaten...");
        const { data: projects } = await supabase.from("projects").select("*");
        const { data: allTimeEntries } = await supabase.from("time_entries").select("*").order("datum");
        const { data: allMaterials } = await supabase.from("material_entries").select("*");

        if (projects) {
          for (const proj of projects) {
            const pName = proj.name.replace(/[/\\?%*:|"<>]/g, "_");
            const projPath = `${root}/projekte/${pName}`;

            if (allTimeEntries) {
              const entries = allTimeEntries.filter(e => e.project_id === proj.id);
              if (entries.length) {
                zip.file(`${projPath}/stunden.xlsx`, createWorkbook("Stunden", entries));
              }
            }

            if (allMaterials) {
              const mats = allMaterials.filter(m => m.project_id === proj.id);
              if (mats.length) {
                zip.file(`${projPath}/materialien.xlsx`, createWorkbook("Materialien", mats));
              }
            }

            tick(`Lade Dateien für Projekt ${proj.name}...`);
            const bucketFolders = [
              { bucket: "project-plans", sub: "plaene" },
              { bucket: "project-photos", sub: "fotos" },
              { bucket: "project-reports", sub: "berichte" },
              { bucket: "project-chef", sub: "chef" },
            ];
            for (const bf of bucketFolders) {
              await downloadStorageFiles(zip, bf.bucket, proj.id, `${projPath}/${bf.sub}`);
            }
          }
        }
      }

      if (sections.regieberichte) {
        tick("Lade Arbeitsberichte...");
        const { data: disturbances } = await supabase.from("disturbances").select("*").order("datum");
        if (disturbances?.length) {
          const enriched = disturbances.map(d => ({
            ...d,
            mitarbeiter: profileMap.get(d.user_id) || d.user_id,
          }));
          zip.file(`${root}/regieberichte/regieberichte.xlsx`, createWorkbook("Arbeitsberichte", enriched));

          tick("Lade Arbeitsbericht-Fotos...");
          const { data: photos } = await supabase.from("disturbance_photos").select("*");
          if (photos) {
            for (const photo of photos) {
              try {
                const { data } = await supabase.storage.from("disturbance-photos").download(photo.file_path);
                if (data) zip.file(`${root}/regieberichte/fotos/${photo.file_name}`, data);
              } catch { /* skip */ }
            }
          }
        }
      }

      if (sections.za_korrekturen) {
        tick("Lade ZA-Korrekturen...");
        const { data: adjustments } = await supabase.from("za_adjustments").select("*").order("created_at");
        if (adjustments?.length) {
          const enriched = adjustments.map(a => ({
            ...a,
            mitarbeiter: profileMap.get(a.user_id) || a.user_id,
            korrigiert_von: profileMap.get(a.adjusted_by) || a.adjusted_by,
          }));
          zip.file(`${root}/za_korrekturen.xlsx`, createWorkbook("ZA-Korrekturen", enriched));
        }
      }

      tick("Erstelle Übersicht...");
      const { data: allProfiles } = await supabase.from("profiles").select("id, vorname, nachname, is_active");
      const { data: allProjects } = await supabase.from("projects").select("id, name, status, plz, adresse");
      const wb = XLSX.utils.book_new();
      if (allProfiles) XLSX.utils.book_append_sheet(wb, sheetFromData(allProfiles), "Mitarbeiter");
      if (allProjects) XLSX.utils.book_append_sheet(wb, sheetFromData(allProjects), "Projekte");
      zip.file(`${root}/uebersicht.xlsx`, XLSX.write(wb, { type: "array", bookType: "xlsx" }));

      setProgress(100);
      setStatusText("ZIP wird erstellt...");

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `backup_${today}.zip`);

      setStatusText("Backup abgeschlossen!");
      toast({ title: "Backup erstellt", description: "Die ZIP-Datei wird heruntergeladen." });
    } catch (err: any) {
      console.error("Backup error:", err);
      toast({ title: "Fehler beim Backup", description: err.message || "Unbekannter Fehler", variant: "destructive" });
      setStatusText("Fehler aufgetreten.");
    } finally {
      setRunning(false);
    }
  }, [sections, toast]);

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <HardDrive className="h-6 w-6 text-primary" />
        Datensicherung
      </h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Backup erstellen</CardTitle>
          <p className="text-sm text-muted-foreground">
            Alle ausgewählten Daten werden als ZIP-Datei heruntergeladen.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(sectionLabels) as BackupSection[]).map((key) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={sections[key]}
                onCheckedChange={(v) => setSections(s => ({ ...s, [key]: !!v }))}
                disabled={running}
              />
              <span className="text-sm">{sectionLabels[key]}</span>
            </label>
          ))}

          {running && (
            <div className="space-y-2 pt-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{statusText}</p>
            </div>
          )}

          <Button
            className="w-full mt-2"
            onClick={runBackup}
            disabled={running || !Object.values(sections).some(Boolean)}
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Backup läuft...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Backup erstellen
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
