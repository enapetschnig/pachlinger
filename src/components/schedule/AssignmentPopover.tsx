import { useState, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Trash2, Clock, Users, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Profile, Project, Assignment } from "./scheduleTypes";

type Block = {
  id: string;
  projectId: string;
  startTime: string;
  endTime: string;
  notizen: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  date: Date | null;
  days?: Date[];
  assignment: Assignment | null;
  projects: Project[];
  profiles?: Profile[];
  initialAdditionalUserIds?: string[];
  /** Single update path (Edit-Modus). */
  onAssign: (
    userId: string,
    date: Date,
    projectId: string,
    notizen?: string,
    startTime?: string,
    endTime?: string,
    assignmentId?: string
  ) => void;
  /** Batch insert path (Erstellen-Modus mit beliebig vielen MA × Tagen × Blöcken). */
  onAssignBatch?: (
    uids: string[],
    dates: Date[],
    blocks: Array<{ projectId: string; startTime: string; endTime: string; notizen: string }>
  ) => void;
  onRemove: (userId: string, date: Date, assignmentId?: string) => void;
}

const newBlock = (): Block => ({
  id: crypto.randomUUID(),
  projectId: "",
  startTime: "07:00",
  endTime: "16:00",
  notizen: "",
});

export function AssignmentPopover({
  open,
  onOpenChange,
  profile,
  date,
  days,
  assignment,
  projects,
  profiles = [],
  initialAdditionalUserIds,
  onAssign,
  onAssignBatch,
  onRemove,
}: Props) {
  const [blocks, setBlocks] = useState<Block[]>([newBlock()]);
  const [additionalUserIds, setAdditionalUserIds] = useState<string[]>([]);

  const isRangeMode = !!(days && days.length > 1);
  const isEditMode = !!assignment;

  useEffect(() => {
    if (assignment) {
      // Edit-Modus: bestehenden Eintrag in einen einzelnen Block laden
      setBlocks([
        {
          id: assignment.id,
          projectId: assignment.project_id,
          startTime: assignment.start_time || "07:00",
          endTime: assignment.end_time || "16:00",
          notizen: assignment.notizen || "",
        },
      ]);
    } else {
      setBlocks([newBlock()]);
    }
    setAdditionalUserIds(initialAdditionalUserIds || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment, open]);

  if (!profile || !date) return null;

  const updateBlock = (id: string, field: keyof Block, value: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const addBlock = () => {
    setBlocks((prev) => {
      const last = prev[prev.length - 1];
      // Default: neue Zeit beginnt da, wo die letzte aufgehört hat
      const startTime = last?.endTime || "12:00";
      return [...prev, { ...newBlock(), startTime }];
    });
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => (prev.length === 1 ? prev : prev.filter((b) => b.id !== id)));
  };

  const toggleAdditional = (uid: string) => {
    setAdditionalUserIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const handleSave = () => {
    if (isEditMode) {
      const b = blocks[0];
      if (!b?.projectId) return;
      onAssign(profile.id, date, b.projectId, b.notizen || undefined, b.startTime, b.endTime, assignment!.id);
      onOpenChange(false);
      return;
    }

    const validBlocks = blocks.filter((b) => b.projectId);
    if (validBlocks.length === 0) return;

    if (onAssignBatch) {
      const dates = isRangeMode ? days! : [date];
      const uids = [profile.id, ...additionalUserIds];
      onAssignBatch(uids, dates, validBlocks);
    } else {
      // Fallback: single onAssign in Schleife
      const dates = isRangeMode ? days! : [date];
      const uids = [profile.id, ...additionalUserIds];
      for (const uid of uids) {
        for (const d of dates) {
          if (isRangeMode) {
            const dow = d.getDay();
            if (dow === 0 || dow === 5 || dow === 6) continue;
          }
          for (const b of validBlocks) {
            onAssign(uid, d, b.projectId, b.notizen || undefined, b.startTime, b.endTime);
          }
        }
      }
    }
    onOpenChange(false);
  };

  const dateLabel = isRangeMode
    ? `${days!.length} Tage: ${format(days![0], "EE dd.MM.", { locale: de })} – ${format(days![days!.length - 1], "EE dd.MM.", { locale: de })}`
    : format(date, "EEEE, dd. MMMM yyyy", { locale: de });

  const otherProfiles = profiles.filter((p) => p.id !== profile.id);
  const totalRows =
    blocks.filter((b) => b.projectId).length *
    (isRangeMode ? days!.filter((d) => { const dow = d.getDay(); return dow !== 0 && dow !== 5 && dow !== 6; }).length : 1) *
    (1 + additionalUserIds.length);

  // Calculate hours for a block
  const calcHours = (b: Block) => {
    const [sh, sm] = b.startTime.split(":").map(Number);
    const [eh, em] = b.endTime.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    const pause = mins > 360 ? 30 : 0;
    return Math.max(0, (mins - pause) / 60).toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEditMode ? "Auftrag bearbeiten" : "Auftrag zuweisen"}
            {" – "}
            {profile.vorname} {profile.nachname}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!isEditMode && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-md p-2 border border-dashed">
              Du kannst hier mehrere Einteilungen für den/die Mitarbeiter und Tag(e) eintragen.
              Jeder Block wird als eigene Zuweisung gebucht (z.B. 07:00–12:00 Kunde A, 12:00–14:00 Kunde B).
            </p>
          )}

          {/* Block-Liste */}
          <div className="space-y-3">
            {blocks.map((b, idx) => (
              <div key={b.id} className="rounded-md border p-3 space-y-2 bg-card relative">
                {!isEditMode && blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBlock(b.id)}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                    title="Entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Einteilung {idx + 1}
                  </span>
                </div>
                <Select
                  value={b.projectId}
                  onValueChange={(v) => updateBlock(b.id, "projectId", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Projekt wählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Arbeitszeit
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={b.startTime}
                      onChange={(e) => updateBlock(b.id, "startTime", e.target.value)}
                      className="h-9 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input
                      type="time"
                      value={b.endTime}
                      onChange={(e) => updateBlock(b.id, "endTime", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{calcHours(b)}h (abzgl. Pause)</p>
                </div>

                <Textarea
                  placeholder="Notiz (optional)…"
                  value={b.notizen}
                  onChange={(e) => updateBlock(b.id, "notizen", e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            ))}
          </div>

          {!isEditMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBlock}
              className="w-full gap-2 border-dashed"
            >
              <Plus className="h-4 w-4" />
              Weitere Einteilung
            </Button>
          )}

          {/* Multi-Mitarbeiter (nur beim Erstellen) */}
          {!isEditMode && otherProfiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3" />
                Auch zuweisen an
              </Label>
              <div className="rounded-md border bg-muted/30 max-h-40 overflow-y-auto p-2 space-y-1.5">
                {otherProfiles.map((p) => (
                  <label
                    key={p.id}
                    htmlFor={`add-${p.id}`}
                    className="flex items-center gap-2 cursor-pointer text-sm hover:bg-background/60 rounded px-1 py-0.5"
                  >
                    <Checkbox
                      id={`add-${p.id}`}
                      checked={additionalUserIds.includes(p.id)}
                      onCheckedChange={() => toggleAdditional(p.id)}
                    />
                    <span>{p.vorname} {p.nachname}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isEditMode && totalRows > 1 && (
            <p className="text-xs text-muted-foreground">
              Es werden <span className="font-semibold text-foreground">{totalRows}</span> Einteilung(en) angelegt
              ({1 + additionalUserIds.length} MA × {isRangeMode ? days!.filter((d) => { const dow = d.getDay(); return dow !== 0 && dow !== 5 && dow !== 6; }).length : 1} Tag(e) × {blocks.filter((b) => b.projectId).length} Block/Blöcke).
            </p>
          )}

          {isEditMode && !isRangeMode && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                onRemove(profile.id, date, assignment!.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Zuweisung entfernen
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={blocks.filter((b) => b.projectId).length === 0}
          >
            {isEditMode
              ? "Speichern"
              : totalRows > 1
              ? `${totalRows} Einteilung(en) anlegen`
              : "Zuweisen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
