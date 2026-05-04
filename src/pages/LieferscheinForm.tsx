import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import {
  COMMON_BAUSEITS,
  EINHEITEN,
  LieferscheinFormData,
  createLieferschein,
  getLieferschein,
  updateLieferschein,
} from "@/lib/lieferschein";

interface Props {
  mode: "create" | "edit";
}

export default function LieferscheinForm({ mode }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, control, reset, formState: { errors } } =
    useForm<LieferscheinFormData>({
      defaultValues: {
        lieferschein_datum: today,
        kunden_nummer: "",
        leistung: "",
        empfaenger_uid: "",
        empfaenger_name: "",
        empfaenger_strasse: "",
        empfaenger_plz: "",
        empfaenger_ort: "",
        betreff: "",
        angebot_nr: "",
        angebot_datum: "",
        bauseits: [],
        positionen: [{ menge: 1, einheit: "Stk.", bezeichnung: "", rabatt_eur: null }],
      },
    });

  const bauseitsField = useFieldArray({ control, name: "bauseits" });
  const positionenField = useFieldArray({ control, name: "positionen" });

  useEffect(() => {
    if (mode === "edit" && id) {
      (async () => {
        try {
          const ls = await getLieferschein(id);
          if (!ls) {
            toast({ variant: "destructive", title: "Lieferschein nicht gefunden" });
            navigate("/lieferscheine");
            return;
          }
          reset({
            lieferschein_datum: ls.lieferschein_datum,
            kunden_nummer: ls.kunden_nummer ?? "",
            leistung: ls.leistung ?? "",
            empfaenger_uid: ls.empfaenger_uid ?? "",
            empfaenger_name: ls.empfaenger_name,
            empfaenger_strasse: ls.empfaenger_strasse ?? "",
            empfaenger_plz: ls.empfaenger_plz ?? "",
            empfaenger_ort: ls.empfaenger_ort ?? "",
            betreff: ls.betreff ?? "",
            angebot_nr: ls.angebot_nr ?? "",
            angebot_datum: ls.angebot_datum ?? "",
            bauseits: ls.bauseits.map((value) => ({ value })),
            positionen:
              ls.positionen.length > 0
                ? ls.positionen.map((p) => ({
                    menge: Number(p.menge),
                    einheit: p.einheit,
                    bezeichnung: p.bezeichnung,
                    rabatt_eur: p.rabatt_eur,
                  }))
                : [{ menge: 1, einheit: "Stk.", bezeichnung: "", rabatt_eur: null }],
          });
        } catch (e: any) {
          toast({ variant: "destructive", title: "Fehler", description: e.message });
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [mode, id, navigate, reset, toast]);

  const onSubmit = async (data: LieferscheinFormData) => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        const newId = await createLieferschein(data);
        toast({ title: "Lieferschein erstellt" });
        navigate(`/lieferscheine/${newId}`);
      } else if (id) {
        await updateLieferschein(id, data);
        toast({ title: "Lieferschein gespeichert" });
        navigate(`/lieferscheine/${id}`);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler beim Speichern", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const addCommonBauseits = (value: string) => {
    bauseitsField.append({ value });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Lädt...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={mode === "create" ? "Neuer Lieferschein" : "Lieferschein bearbeiten"} />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle>Allgemein</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lieferschein_datum">Lieferscheindatum *</Label>
                  <Input
                    id="lieferschein_datum"
                    type="date"
                    {...register("lieferschein_datum", { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kunden_nummer">Kundennummer</Label>
                  <Input id="kunden_nummer" {...register("kunden_nummer")} placeholder="z.B. 202755" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leistung">Leistung</Label>
                  <Input id="leistung" {...register("leistung")} placeholder="optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empfaenger_uid">Ihre UID-Nr.</Label>
                  <Input id="empfaenger_uid" {...register("empfaenger_uid")} placeholder="ATU…" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empfänger */}
          <Card>
            <CardHeader>
              <CardTitle>Empfänger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empfaenger_name">Name / Firma *</Label>
                <Input
                  id="empfaenger_name"
                  {...register("empfaenger_name", { required: "Empfänger erforderlich" })}
                  placeholder="z.B. Schulungszentrum Fohnsdorf"
                />
                {errors.empfaenger_name && (
                  <p className="text-xs text-destructive">{errors.empfaenger_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="empfaenger_strasse">Straße</Label>
                <Input id="empfaenger_strasse" {...register("empfaenger_strasse")} placeholder="z.B. Hauptstraße 69" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="empfaenger_plz">PLZ</Label>
                  <Input id="empfaenger_plz" {...register("empfaenger_plz")} placeholder="8753" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="empfaenger_ort">Ort</Label>
                  <Input id="empfaenger_ort" {...register("empfaenger_ort")} placeholder="Fohnsdorf" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Betreff & Angebot */}
          <Card>
            <CardHeader>
              <CardTitle>Betreff & Angebot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="betreff">Betreff</Label>
                <Input id="betreff" {...register("betreff")} placeholder="z.B. Sanierung Brandschutzklappen 2026" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="angebot_nr">Angebot Nr.</Label>
                  <Input id="angebot_nr" {...register("angebot_nr")} placeholder="z.B. AN0014/2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="angebot_datum">Angebot vom</Label>
                  <Input id="angebot_datum" type="date" {...register("angebot_datum")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bauseits */}
          <Card>
            <CardHeader>
              <CardTitle>Bauseits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {COMMON_BAUSEITS.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCommonBauseits(c)}
                  >
                    + {c}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                {bauseitsField.fields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      {...register(`bauseits.${idx}.value`)}
                      placeholder="Stichpunkt"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => bauseitsField.remove(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bauseitsField.append({ value: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Eigener Stichpunkt
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Positionen */}
          <Card>
            <CardHeader>
              <CardTitle>Positionen *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {positionenField.fields.map((field, idx) => (
                <div key={field.id} className="border rounded-md p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-bold">Pos. {idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => positionenField.remove(idx)}
                      disabled={positionenField.fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Menge *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        {...register(`positionen.${idx}.menge`, {
                          required: true,
                          valueAsNumber: true,
                          min: 0,
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Einheit *</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...register(`positionen.${idx}.einheit`, { required: true })}
                      >
                        {EINHEITEN.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Rabatt EUR (optional)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`positionen.${idx}.rabatt_eur`, {
                          setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                        })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bezeichnung *</Label>
                    <Textarea
                      {...register(`positionen.${idx}.bezeichnung`, { required: true })}
                      rows={2}
                      placeholder="z.B. BSK DN 250 manuell"
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  positionenField.append({
                    menge: 1,
                    einheit: "Stk.",
                    bezeichnung: "",
                    rabatt_eur: null,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Position hinzufügen
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-background py-4 border-t">
            <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-2" />
              {submitting ? "Speichert..." : mode === "create" ? "Lieferschein erstellen" : "Speichern"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(mode === "edit" && id ? `/lieferscheine/${id}` : "/lieferscheine")}
            >
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
