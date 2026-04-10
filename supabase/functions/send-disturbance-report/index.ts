import { Resend } from "https://esm.sh/resend@2.0.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Supabase Admin Client for reading settings
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Logo removed - using text header instead

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Material {
  id: string;
  material: string;
  menge: string | null;
  notizen: string | null;
}

interface Photo {
  id: string;
  file_path: string;
  file_name: string;
}

interface Disturbance {
  id: string;
  datum: string;
  start_time: string;
  end_time: string;
  pause_minutes: number;
  stunden: number;
  kunde_name: string;
  kunde_email: string | null;
  kunde_adresse: string | null;
  kunde_telefon: string | null;
  beschreibung: string;
  notizen: string | null;
  unterschrift_kunde: string;
}

interface ReportRequest {
  disturbance: Disturbance;
  materials: Material[];
  technicianNames?: string[];
  technicianName?: string; // Legacy support
  photos?: Photo[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-AT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch image:", url, response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

async function generatePDF(data: ReportRequest & { technicians: string[] }, photoImages: (string | null)[]): Promise<string> {
  const { disturbance, materials, technicians, photos } = data;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 20; // margin
  const cw = pw - 2 * m; // content width
  let y = m;
  const blue = [37, 99, 168] as const;
  const gray = [120, 120, 120] as const;
  const black = [30, 30, 30] as const;
  const lightGray = [245, 245, 245] as const;

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.setDrawColor(200, 200, 200);
    doc.line(m, ph - 18, m + cw, ph - 18);
    doc.text("FASCHING Geb\u00e4udetechnik \u2022 Heizung \u2022 K\u00e4lte \u2022 L\u00fcftung \u2022 Sanit\u00e4r \u2022 Service", m, ph - 13);
    doc.text(`Erstellt: ${new Date().toLocaleDateString("de-AT")}`, m + cw, ph - 13, { align: "right" });
  };

  const checkPage = (needed: number) => {
    if (y + needed > ph - 25) { addFooter(); doc.addPage(); y = m; }
  };

  const sectionTitle = (title: string) => {
    checkPage(15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blue);
    doc.text(title.toUpperCase(), m, y);
    y += 1;
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.5);
    doc.line(m, y, m + cw, y);
    y += 6;
    doc.setTextColor(...black);
  };

  const field = (label: string, value: string, bold = false) => {
    checkPage(6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(label, m, y);
    doc.setTextColor(...black);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(value, m + 38, y);
    y += 5.5;
  };

  // === HEADER ===
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...blue);
  doc.text("FASCHING", m, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text("GEB\u00c4UDETECHNIK", m + 47, y);
  y += 5;
  doc.setFontSize(7);
  doc.text("Heizung \u2022 K\u00e4lte \u2022 L\u00fcftung \u2022 Sanit\u00e4r \u2022 Service", m, y);
  y += 3;
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.8);
  doc.line(m, y, m + cw, y);
  y += 8;

  // === TITLE ===
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("Arbeitsbericht", m, y);
  // Date right-aligned
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(formatDate(disturbance.datum), m + cw, y, { align: "right" });
  y += 12;

  // === KUNDENDATEN ===
  sectionTitle("Kundendaten");
  field("Kunde", disturbance.kunde_name, true);
  if (disturbance.kunde_adresse) field("Adresse", disturbance.kunde_adresse);
  y += 4;

  // === EINSATZDATEN ===
  sectionTitle("Einsatzdaten");
  const st = disturbance.start_time.slice(0, 5);
  const et = disturbance.end_time.slice(0, 5);
  field("Datum", formatDate(disturbance.datum));
  field("Arbeitszeit", `${st} \u2013 ${et} Uhr`);
  if (disturbance.pause_minutes > 0) field("Pause", `${disturbance.pause_minutes} Min.`);
  field("Stunden", `${disturbance.stunden.toFixed(2)} h`, true);
  if (technicians.length === 1) {
    field("Techniker", technicians[0]);
  } else if (technicians.length > 1) {
    field("Techniker", technicians.join(", "));
  }
  y += 4;

  // === DURCHGEFÜHRTE ARBEITEN ===
  sectionTitle("Durchgef\u00fchrte Arbeiten");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...black);
  const beschreibungLines = doc.splitTextToSize(disturbance.beschreibung, cw);
  for (const line of beschreibungLines) {
    checkPage(6);
    doc.text(line, m, y);
    y += 5;
  }
  y += 4;

  // === MATERIAL ===
  if (materials && materials.length > 0) {
    sectionTitle("Verwendetes Material");

    // Table header
    doc.setFillColor(...lightGray);
    doc.rect(m, y - 4, cw, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text("Material", m + 2, y);
    doc.text("Menge", m + cw - 2, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    materials.forEach((mat, i) => {
      checkPage(7);
      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(m, y - 4, cw, 7, "F");
      }
      doc.setTextColor(...black);
      doc.text(mat.material || "-", m + 2, y);
      doc.setTextColor(...gray);
      doc.text(mat.menge || "-", m + cw - 2, y, { align: "right" });
      y += 6;
    });
    y += 6;
  }

  // === FOTOS ===
  if (photos && photos.length > 0 && photoImages.some(img => img !== null)) {
    addFooter();
    doc.addPage();
    y = m;
    sectionTitle("Fotodokumentation");

    for (let i = 0; i < photos.length; i++) {
      const imageData = photoImages[i];
      if (!imageData) continue;
      checkPage(70);
      try {
        doc.addImage(imageData, "JPEG", m, y, 80, 60);
        y += 63;
        doc.setFontSize(7);
        doc.setTextColor(...gray);
        doc.text(photos[i].file_name, m, y);
        y += 8;
      } catch (e) { console.error("Error adding image:", e); }
    }
  }

  // === UNTERSCHRIFT ===
  checkPage(55);
  sectionTitle("Kundenunterschrift");
  if (disturbance.unterschrift_kunde) {
    try {
      doc.addImage(disturbance.unterschrift_kunde, "PNG", m, y, 55, 22);
      y += 25;
    } catch (e) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...gray);
      doc.text("[Unterschrift nicht verf\u00fcgbar]", m, y + 8);
      y += 15;
    }
  }
  doc.setDrawColor(180, 180, 180);
  doc.line(m, y, m + 60, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text("Datum, Unterschrift Kunde", m, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  const confirm = "Der Kunde best\u00e4tigt mit seiner Unterschrift die ordnungsgem\u00e4\u00dfe Durchf\u00fchrung der oben genannten Arbeiten.";
  doc.text(doc.splitTextToSize(confirm, cw), m, y);

  // Footer on last page
  addFooter();

  return doc.output("datauristring").split(",")[1];
}

function generateEmailHtml(data: ReportRequest & { technicians: string[] }): string {
  const { disturbance, technicians } = data;
  const technicianDisplay = technicians.length === 1 ? technicians[0] : technicians.join(", ");
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; }
        .header { color: #b41c1c; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">FASCHING GEBÄUDETECHNIK</div>
        <h2>Arbeitsbericht</h2>
        
        <p>Sehr geehrte Damen und Herren,</p>
        
        <p>im Anhang finden Sie den Arbeitsbericht für den Einsatz bei <strong>${disturbance.kunde_name}</strong> vom <strong>${formatDate(disturbance.datum)}</strong>.</p>
        
        <div class="info-box">
          <strong>Zusammenfassung:</strong><br>
          Techniker: ${technicianDisplay}<br>
          Arbeitszeit: ${disturbance.start_time.slice(0, 5)} - ${disturbance.end_time.slice(0, 5)} Uhr<br>
          Gesamtstunden: ${disturbance.stunden.toFixed(2)} h
        </div>
        
        <p>Der vollständige Bericht mit allen Details und der Kundenunterschrift befindet sich im angehängten PDF-Dokument.</p>
        
        <p>Mit freundlichen Grüßen,<br>
        FASCHING Gebäudetechnik</p>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { disturbance, materials, technicianNames, technicianName, photos }: ReportRequest = await req.json();

    // Backward compatibility + fallback
    const technicians = technicianNames?.length ? technicianNames : 
                        technicianName ? [technicianName] : ["Techniker"];

    if (!disturbance || !disturbance.unterschrift_kunde) {
      return new Response(
        JSON.stringify({ error: "Disturbance data and signature required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Generating PDF for disturbance:", disturbance.id);

    // Fetch photo images from storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const photoImages: (string | null)[] = [];
    if (photos && photos.length > 0) {
      console.log(`Fetching ${photos.length} photos...`);
      for (const photo of photos) {
        const photoUrl = `${supabaseUrl}/storage/v1/object/public/disturbance-photos/${photo.file_path}`;
        const imageData = await fetchImageAsBase64(photoUrl);
        photoImages.push(imageData);
      }
    }

    // Generate PDF
    const pdfBase64 = await generatePDF({ disturbance, materials, technicians, photos }, photoImages);

    // Generate simple email HTML
    const emailHtml = generateEmailHtml({ disturbance, materials, technicians });

    // Fetch office email from settings with fallback
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "disturbance_report_email")
      .maybeSingle();

    const officeEmail = setting?.value || "office@fasching-gebaeudetechnik.at";
    console.log("Using office email:", officeEmail);

    // Prepare recipients - office email for all reports
    const recipients = [officeEmail];
    if (disturbance.kunde_email) {
      recipients.push(disturbance.kunde_email);
    }

    // Create filename
    const dateForFilename = formatDateShort(disturbance.datum).replace(/\./g, "-");
    const kundeForFilename = disturbance.kunde_name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    const pdfFilename = `Arbeitsbericht_${kundeForFilename}_${dateForFilename}.pdf`;

    const subject = `Arbeitsbericht - ${disturbance.kunde_name} - ${formatDateShort(disturbance.datum)}`;

    console.log("Sending email with PDF attachment to:", recipients);

    const emailResponse = await resend.emails.send({
      from: "FASCHING Gebäudetechnik <noreply@chrisnapetschnig.at>",
      to: recipients,
      subject: subject,
      html: emailHtml,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBase64,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error sending disturbance report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
