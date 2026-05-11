import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createKunde, updateKunde, Kunde, KundeInput } from "@/lib/kunden";

interface Props {
  kunde: Kunde | null;
  onSaved: (k: Kunde) => void;
  onCancel: () => void;
}

export function KundeForm({ kunde, onSaved, onCancel }: Props) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KundeInput>({
    defaultValues: {
      name: "",
      strasse: "",
      plz: "",
      ort: "",
      kunden_nummer: "",
      uid_nummer: "",
      email: "",
      telefon: "",
      notizen: "",
    },
  });

  useEffect(() => {
    reset({
      name: kunde?.name ?? "",
      strasse: kunde?.strasse ?? "",
      plz: kunde?.plz ?? "",
      ort: kunde?.ort ?? "",
      kunden_nummer: kunde?.kunden_nummer ?? "",
      uid_nummer: kunde?.uid_nummer ?? "",
      email: kunde?.email ?? "",
      telefon: kunde?.telefon ?? "",
      notizen: kunde?.notizen ?? "",
    });
  }, [kunde, reset]);

  const onSubmit = async (data: KundeInput) => {
    try {
      const saved = kunde
        ? await updateKunde(kunde.id, data)
        : await createKunde(data);
      toast({ title: kunde ? "Kunde aktualisiert" : "Kunde angelegt" });
      onSaved(saved);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kunde-name">Name / Firma *</Label>
        <Input
          id="kunde-name"
          autoComplete="organization"
          {...register("name", { required: "Name erforderlich" })}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="kunde-strasse">Straße</Label>
        <Input
          id="kunde-strasse"
          autoComplete="address-line1"
          {...register("strasse")}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2 col-span-1">
          <Label htmlFor="kunde-plz">PLZ</Label>
          <Input
            id="kunde-plz"
            autoComplete="postal-code"
            inputMode="numeric"
            {...register("plz")}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="kunde-ort">Ort</Label>
          <Input
            id="kunde-ort"
            autoComplete="address-level2"
            {...register("ort")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="kunde-knr">Kundennummer</Label>
          <Input id="kunde-knr" {...register("kunden_nummer")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kunde-uid">UID-Nr.</Label>
          <Input id="kunde-uid" {...register("uid_nummer")} placeholder="ATU…" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="kunde-email">E-Mail</Label>
          <Input
            id="kunde-email"
            type="email"
            autoComplete="email"
            {...register("email")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kunde-tel">Telefon</Label>
          <Input
            id="kunde-tel"
            type="tel"
            autoComplete="tel"
            {...register("telefon")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kunde-notizen">Notizen</Label>
        <Textarea id="kunde-notizen" rows={3} {...register("notizen")} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? "Speichert..." : "Speichern"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
