export function formatDateDe(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function statusLabel(status: "entwurf" | "versendet" | "unterschrieben"): string {
  if (status === "entwurf") return "Entwurf";
  if (status === "versendet") return "Versendet";
  return "Unterschrieben";
}
