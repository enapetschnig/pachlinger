import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationButtonProps {
  onAddressFound: (address: string) => void;
  onPlzFound?: (plz: string) => void;
}

export function LocationButton({ onAddressFound, onPlzFound }: LocationButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Nicht verfügbar",
        description: "Standortermittlung wird von Ihrem Gerät nicht unterstützt.",
      });
      return;
    }

    setLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "de",
          },
        }
      );

      if (!response.ok) throw new Error("Geocoding fehlgeschlagen");

      const data = await response.json();
      const addr = data.address || {};

      const street = addr.road || "";
      const houseNumber = addr.house_number || "";
      const plz = addr.postcode || "";
      const city = addr.city || addr.town || addr.village || addr.municipality || "";

      const parts = [];
      if (street) parts.push(houseNumber ? `${street} ${houseNumber}` : street);
      if (plz && city) parts.push(`${plz} ${city}`);
      else if (city) parts.push(city);

      const addressStr = parts.join(", ");

      if (addressStr) {
        onAddressFound(addressStr);
        if (onPlzFound && plz) {
          onPlzFound(plz);
        }
        toast({ title: "Standort gefunden", description: addressStr });
      } else {
        toast({
          variant: "destructive",
          title: "Keine Adresse",
          description: "Konnte keine Adresse für Ihren Standort ermitteln.",
        });
      }
    } catch (error: any) {
      let message = "Standort konnte nicht ermittelt werden.";
      if (error.code === 1) message = "Standortzugriff wurde verweigert.";
      else if (error.code === 2) message = "Standort nicht verfügbar.";
      else if (error.code === 3) message = "Zeitüberschreitung bei Standortermittlung.";

      toast({ variant: "destructive", title: "Fehler", description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={loading}
      className="h-10 w-10 shrink-0"
      title="Aktuellen Standort verwenden"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
    </Button>
  );
}
