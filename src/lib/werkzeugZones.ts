export interface WerkzeugZone {
  value: string;
  label: string;
}

export const WERKZEUG_ZONES: WerkzeugZone[] = [
  { value: "zone_1", label: "Zone 1 (0 – 5 km)" },
  { value: "zone_2", label: "Zone 2 (5 – 10 km)" },
  { value: "zone_3", label: "Zone 3 (10 – 15 km)" },
  { value: "zone_4", label: "Zone 4 (20 – 35 km)" },
  { value: "zone_5", label: "Zone 5 (Wien 19, 20, 21, 22)" },
  { value: "zone_6", label: "Zone 6 (Wien 01 – 18)" },
];

export function getZoneLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return WERKZEUG_ZONES.find((z) => z.value === value)?.label || null;
}
