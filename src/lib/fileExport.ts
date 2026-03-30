export const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_");

const escapeCsvValue = (value: string | number | null | undefined) => {
  const stringValue = value == null ? "" : String(value);
  const normalizedValue = stringValue.replace(/"/g, '""');
  return /[";\r\n]/.test(stringValue) ? `"${normalizedValue}"` : normalizedValue;
};

export const downloadCsv = (rows: Array<Array<string | number | null | undefined>>, fileName: string) => {
  const csvContent = rows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
