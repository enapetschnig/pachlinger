import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { calculateSuggestedStartTime, calculateWorkTimeRange } from "@/lib/workingHours";

type Project = {
  id: string;
  name: string;
  plz: string;
};

interface FillRemainingHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  remainingHours: number;
  bookedHours: number;
  targetHours: number;
  projects: Project[];
  lastEndTime: string | null;
  onSubmit: (entry: {
    projectId: string | null;
    locationType: string;
    description: string;
    hours: number;
    startTime: string;
    endTime: string;
    pauseMinutes: number;
    pauseStart: string | null;
    pauseEnd: string | null;
  }) => Promise<void>;
}

export const FillRemainingHoursDialog = ({
  open,
  onOpenChange,
  date,
  remainingHours,
  bookedHours,
  targetHours,
  projects,
  lastEndTime,
  onSubmit,
}: FillRemainingHoursDialogProps) => {
  const [locationType, setLocationType] = useState<"baustelle" | "werkstatt">("werkstatt");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const suggestedStartTime = useMemo(
    () => calculateSuggestedStartTime(new Date(date), lastEndTime, 0),
    [date, lastEndTime]
  );

  const calculatedTimes = useMemo(
    () => calculateWorkTimeRange(new Date(date), remainingHours, suggestedStartTime),
    [date, remainingHours, suggestedStartTime]
  );

  useEffect(() => {
    if (open) {
      setLocationType("werkstatt");
      setProjectId("");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        projectId: locationType === "werkstatt" ? null : (projectId || null),
        locationType,
        description,
        hours: remainingHours,
        startTime: calculatedTimes.startTime,
        endTime: calculatedTimes.endTime,
        pauseMinutes: calculatedTimes.pauseMinutes,
        pauseStart: calculatedTimes.pauseStart || null,
        pauseEnd: calculatedTimes.pauseEnd || null,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Reststunden auffüllen
          </DialogTitle>
          <DialogDescription>
            Fehlende Stunden automatisch buchen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bereits gebucht:</span>
              <span className="font-medium">{bookedHours.toFixed(2)} h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sollstunden:</span>
              <span className="font-medium">{targetHours.toFixed(2)} h</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-medium">Reststunden:</span>
              <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                {remainingHours.toFixed(2)} h
              </Badge>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Wird gespeichert:</span>
              <span className="font-mono font-medium text-right">
                {calculatedTimes.startTime || "07:00"} - {calculatedTimes.endTime || "—"}
              </span>
            </div>
            {calculatedTimes.pauseStart && calculatedTimes.pauseEnd && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Pause:</span>
                <span className="font-mono font-medium text-right">
                  {calculatedTimes.pauseStart} - {calculatedTimes.pauseEnd}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Arbeitsort</Label>
            <RadioGroup
              value={locationType}
              onValueChange={(value: "baustelle" | "werkstatt") => setLocationType(value)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="baustelle" id="fill-baustelle" className="peer sr-only" />
                <Label
                  htmlFor="fill-baustelle"
                  className="flex h-12 cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary text-sm"
                >
                  🏗️ Baustelle
                </Label>
              </div>
              <div>
                <RadioGroupItem value="werkstatt" id="fill-werkstatt" className="peer sr-only" />
                <Label
                  htmlFor="fill-werkstatt"
                  className="flex h-12 cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary text-sm"
                >
                  🔧 Werkstatt
                </Label>
              </div>
            </RadioGroup>
          </div>

          {locationType === "baustelle" && (
            <div className="space-y-2">
              <Label>Projekt <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Projekt auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.plz})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Beschreibung <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Werkstattarbeit, Aufräumen..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || remainingHours <= 0 || !calculatedTimes.endTime}
            >
              {submitting ? "Wird gebucht..." : "Reststunden buchen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
