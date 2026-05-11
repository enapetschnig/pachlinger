import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, X } from "lucide-react";
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
import { ensureKundeForLieferschein, Kunde } from "@/lib/kunden";
import { EmpfaengerCombobox } from "@/components/lieferschein/EmpfaengerCombobox";
import { VoiceInput } from "@/components/lieferschein/VoiceInput";

interface Props {
  mode: "create" | "edit";
}

export default function LieferscheinForm({ mode }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [showRabatt, setShowRabatt] = useState<Record<number, boolean>>({});

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<LieferscheinFormData>({
    defaultValues: {
      kunde_id: null,
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
            kunde_id: ls.kunde_id ?? null,
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
          // Rabatt-Toggle State aus Daten ableiten
          const initial: Record<number, boolean> = {};
          ls.positionen.forEach((p, idx) => {
            if (p.rabatt_eur !== null && p.rabatt_eur !== undefined && Number(p.rabatt_eur) > 0) {
              initial[idx] = true;
            }
          });
          setShowRabatt(initial);
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
      // Automatisches Anlegen / Verknüpfen des Kunden basierend auf Empfänger-Name
      let kundeNew = false;
      try {
        const r = await ensureKundeForLieferschein({
          kunde_id: data.kunde_id,
          name: data.empfaenger_name,
          strasse: data.empfaenger_strasse,
          plz: data.empfaenger_plz,
          ort: data.empfaenger_ort,
          kunden_nummer: data.kunden_nummer,
          uid_nummer: data.empfaenger_uid,
        });
        data.kunde_id = r.kunde_id;
        kundeNew = r.created;
      } catch (e) {
        // Wenn auto-create scheitert (z.B. RLS), Lieferschein ohne Verknüpfung speichern
        data.kunde_id = null;
      }

      if (mode === "create") {
        const newId = await createLieferschein(data);
        toast({
          title: "Lieferschein erstellt",
          description: kundeNew ? `Kunde „${data.empfaenger_name}" wurde neu angelegt.` : undefined,
        });
        navigate(`/lieferscheine/${newId}`, { state: { openSignAfterCreate: true } });
      } else if (id) {
        await updateLieferschein(id, data);
        toast({
          title: "Lieferschein gespeichert",
          description: kundeNew ? `Kunde „${data.empfaenger_name}" wurde neu angelegt.` : undefined,
        });
        navigate(`/lieferscheine/${id}`);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler beim Speichern", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const addBauseits = (value: string) => {
    if (!value.trim()) return;
    bauseitsField.append({ value });
  };

  const handleSelectKunde = (k: Kunde) => {
    setValue("kunde_id", k.id, { shouldDirty: true });
    setValue("empfaenger_name", k.name);
    setValue("empfaenger_strasse", k.strasse ?? "");
    setValue("empfaenger_plz", k.plz ?? "");
    setValue("empfaenger_ort", k.ort ?? "");
    setValue("kunden_nummer", k.kunden_nummer ?? "");
    setValue("empfaenger_uid", k.uid_nummer ?? "");
  };

  const handleClearKunde = () => {
    setValue("kunde_id", null);
  };

  const linkedKundeId = watch("kunde_id");
  const bauseitsValues = watch("bauseits");

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
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl pb-32">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader className="pb-3">
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
                  <Label htmlFor="leistung">Leistung</Label>
                  <Input id="leistung" {...register("leistung")} placeholder="optional" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empfänger mit Kunden-Combobox */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Empfänger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empfaenger_name">Name / Firma *</Label>
                <Controller
                  name="empfaenger_name"
                  control={control}
                  rules={{ required: "Empfänger erforderlich" }}
                  render={({ field }) => (
                    <EmpfaengerCombobox
                      inputId="empfaenger_name"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        // Verbindung zum Kunden trennen, wenn Name geändert wird
                        if (linkedKundeId) setValue("kunde_id", null);
                      }}
                      onSelectKunde={handleSelectKunde}
                      onClearKunde={handleClearKunde}
                      linkedKundeId={linkedKundeId}
                      placeholder="z.B. Schulungszentrum Fohnsdorf"
                    />
                  )}
                />
                {errors.empfaenger_name && (
                  <p className="text-xs text-destructive">{errors.empfaenger_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="empfaenger_strasse">Straße</Label>
                <Input
                  id="empfaenger_strasse"
                  autoComplete="address-line1"
                  {...register("empfaenger_strasse")}
                  placeholder="z.B. Hauptstraße 69"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="empfaenger_plz">PLZ</Label>
                  <Input
                    id="empfaenger_plz"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    {...register("empfaenger_plz")}
                    placeholder="8753"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="empfaenger_ort">Ort</Label>
                  <Input
                    id="empfaenger_ort"
                    autoComplete="address-level2"
                    {...register("empfaenger_ort")}
                    placeholder="Fohnsdorf"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="kunden_nummer">Kundennummer</Label>
                  <Input id="kunden_nummer" {...register("kunden_nummer")} placeholder="z.B. 202755" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empfaenger_uid">UID-Nr.</Label>
                  <Input id="empfaenger_uid" {...register("empfaenger_uid")} placeholder="ATU…" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Betreff & Angebot */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Betreff & Angebot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="betreff">Betreff</Label>
                  <Controller
                    name="betreff"
                    control={control}
                    render={({ field }) => (
                      <VoiceInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        kind="betreff"
                      />
                    )}
                  />
                </div>
                <Controller
                  name="betreff"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="betreff"
                      placeholder="z.B. Sanierung Brandschutzklappen 2026"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
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

          {/* Bauseits als Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Bauseits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {bauseitsField.fields.map((field, idx) => (
                  <Badge
                    key={field.id}
                    variant="secondary"
                    className="h-8 pl-3 pr-1 gap-1 text-sm font-normal"
                  >
                    {bauseitsValues?.[idx]?.value || ""}
                    <button
                      type="button"
                      onClick={() => bauseitsField.remove(idx)}
                      className="ml-1 rounded hover:bg-muted-foreground/20 p-0.5"
                      aria-label="Entfernen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="bauseits-input"
                  placeholder="Eigener Stichpunkt (Enter)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBauseits((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_BAUSEITS.filter(
                  (c) => !bauseitsValues?.some((b) => b.value === c),
                ).map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => addBauseits(c)}
                  >
                    + {c}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Positionen */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Positionen *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {positionenField.fields.map((field, idx) => {
                const rabattOn = !!showRabatt[idx];
                return (
                  <div key={field.id} className="border rounded-md p-3 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-bold">Pos. {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          positionenField.remove(idx);
                          setShowRabatt((prev) => {
                            const next: Record<number, boolean> = {};
                            Object.entries(prev).forEach(([k, v]) => {
                              const n = Number(k);
                              if (n < idx) next[n] = v;
                              else if (n > idx) next[n - 1] = v;
                            });
                            return next;
                          });
                        }}
                        disabled={positionenField.fields.length === 1}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1 col-span-1">
                        <Label className="text-xs">Menge *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          inputMode="decimal"
                          {...register(`positionen.${idx}.menge`, {
                            required: true,
                            valueAsNumber: true,
                            min: 0,
                          })}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
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
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Bezeichnung *</Label>
                        <Controller
                          name={`positionen.${idx}.bezeichnung`}
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <VoiceInput value={field.value ?? ""} onChange={field.onChange} />
                          )}
                        />
                      </div>
                      <Controller
                        name={`positionen.${idx}.bezeichnung`}
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <Textarea
                            rows={2}
                            placeholder="z.B. BSK DN 250 manuell"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    </div>

                    {rabattOn ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Rabatt EUR</Label>
                          <button
                            type="button"
                            onClick={() => {
                              setValue(`positionen.${idx}.rabatt_eur`, null);
                              setShowRabatt((p) => ({ ...p, [idx]: false }));
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Entfernen
                          </button>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          {...register(`positionen.${idx}.rabatt_eur`, {
                            setValueAs: (v) =>
                              v === "" || v === null || v === undefined ? null : Number(v),
                          })}
                          placeholder="0,00"
                        />
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRabatt((p) => ({ ...p, [idx]: true }))}
                        className="text-xs"
                      >
                        + Rabatt hinzufügen
                      </Button>
                    )}
                  </div>
                );
              })}
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
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                Position hinzufügen
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>

      {/* Sticky Bottom-Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background border-t z-10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="container mx-auto max-w-4xl px-3 sm:px-4 py-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(mode === "edit" && id ? `/lieferscheine/${id}` : "/lieferscheine")
            }
            disabled={submitting}
          >
            <X className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Abbrechen</span>
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmit(onSubmit)}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {submitting
              ? "Speichert..."
              : mode === "create"
              ? "Lieferschein erstellen"
              : "Speichern"}
          </Button>
        </div>
      </div>
    </div>
  );
}
