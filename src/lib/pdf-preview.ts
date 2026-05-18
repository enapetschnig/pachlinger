/**
 * Rendert einen PDF-Blob als PNG-Bilder (eine pro Seite).
 * Funktioniert verlässlich auf allen Mobile-Browsern (iOS Safari, Android Chrome),
 * im Gegensatz zu eingebetteten <iframe>-PDFs.
 */
export async function renderPdfBlobToImages(blob: Blob, scale = 1.5): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await blob.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    // pdfjs erwartet ein RenderParameters-Objekt mit canvas + canvasContext + viewport
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
    images.push(canvas.toDataURL("image/png"));
  }

  return images;
}
