import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import type { LieferscheinWithPositions } from "@/lib/lieferschein";
import { formatDateDe } from "@/lib/lieferschein-format";

// Arimo = Open-Source-Pendant zu Arial (metrisch identisch).
// Wird absolut über origin geladen, damit der Aufruf aus jeder Route klappt.
const fontOrigin =
  typeof window !== "undefined" ? window.location.origin : "";

Font.register({
  family: "Arimo",
  fonts: [
    { src: `${fontOrigin}/fonts/arimo-regular.woff`, fontWeight: "normal", fontStyle: "normal" },
    { src: `${fontOrigin}/fonts/arimo-bold.woff`, fontWeight: "bold", fontStyle: "normal" },
    { src: `${fontOrigin}/fonts/arimo-italic.woff`, fontWeight: "normal", fontStyle: "italic" },
    { src: `${fontOrigin}/fonts/arimo-bold-italic.woff`, fontWeight: "bold", fontStyle: "italic" },
  ],
});

const PACHLINGER_RED = "#D9201E";
const PACHLINGER_ORANGE = "#F26B1F";
const ANTHRACITE = "#1F2429";
const BORDER = "#000000";
const MUTED = "#5F6770";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 60,
    paddingLeft: 50,
    paddingRight: 50,
    fontSize: 10,
    fontFamily: "Arimo",
    color: ANTHRACITE,
    lineHeight: 1.25,
  },

  // ----- Reihe 1: Sender (links) + Brand/Logo (rechts) -----
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  senderBox: { width: "50%" },
  senderName: { fontFamily: "Arimo", fontWeight: "bold", fontSize: 10, marginBottom: 0 },
  senderLine: { fontSize: 9, lineHeight: 1.35 },

  brandBox: {
    width: "46%",
    alignItems: "flex-end",
  },
  brandLogo: {
    width: "100%",
    objectFit: "contain",
  },

  // ----- Reihe 2: Empfänger (links) + Meta-Tabelle (rechts) -----
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  recipientBox: { width: "50%", paddingTop: 6 },
  recipientAddrLine: {
    fontSize: 7.5,
    color: ANTHRACITE,
    borderBottomWidth: 0.5,
    borderBottomColor: ANTHRACITE,
    paddingBottom: 1,
    marginBottom: 14,
  },
  recipientText: { fontFamily: "Arimo", fontWeight: "bold", fontSize: 13, lineHeight: 1.3 },

  metaBox: { width: "46%" },
  metaTable: {
    borderWidth: 0.7,
    borderColor: BORDER,
  },
  metaTitleRow: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.7,
    borderBottomColor: BORDER,
  },
  metaTitle: {
    fontFamily: "Arimo", fontWeight: "bold",
    fontSize: 14,
    color: ANTHRACITE,
  },
  metaRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    minHeight: 18,
  },
  metaCellLabel: {
    width: "55%",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: BORDER,
    fontSize: 10,
  },
  metaCellValue: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 10,
    fontFamily: "Arimo", fontWeight: "bold",
  },
  pageOf: {
    fontSize: 8,
    color: ANTHRACITE,
    textAlign: "right",
    marginTop: 3,
  },

  // ----- Betreff -----
  betreffRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
    marginBottom: 10,
  },
  betreffLabel: {
    fontFamily: "Arimo", fontWeight: "bold",
    fontSize: 14,
    textDecoration: "underline",
    marginRight: 18,
  },
  betreffText: {
    fontFamily: "Arimo", fontWeight: "bold",
    fontSize: 14,
  },

  // ----- Spaltenkopf-Box "Pos. Menge Einheit Bezeichnung" (dünner Rahmen, KEIN grauer Hintergrund) -----
  posHeaderRow: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: BORDER,
    paddingVertical: 2,
  },
  posHeaderCell: { fontSize: 8.5, paddingHorizontal: 4 },
  posHeaderDivider: { borderRightWidth: 0.5, borderRightColor: BORDER },
  colPos: { width: 30 },
  colMenge: { width: 50 },
  colEinheit: { width: 50 },
  colBezeichnung: { flex: 1 },

  angebotLine: {
    fontFamily: "Arimo", fontWeight: "bold",
    fontSize: 10,
    marginTop: 6,
    marginBottom: 4,
    paddingLeft: 80,
  },
  bauseitsHeader: {
    fontFamily: "Arimo", fontWeight: "bold",
    fontSize: 10,
    marginTop: 10,
    marginBottom: 2,
    paddingLeft: 80,
  },
  bauseitsItem: {
    fontSize: 10,
    paddingLeft: 100,
    lineHeight: 1.35,
  },

  positionsBlock: { marginTop: 22 },
  positionRow: {
    flexDirection: "row",
    paddingVertical: 7,
    alignItems: "flex-start",
  },
  positionPos: { width: 30, fontSize: 10, paddingHorizontal: 4 },
  positionMenge: { width: 50, fontSize: 10, paddingLeft: 4 },
  positionEinheit: { width: 50, fontSize: 10 },
  positionBezeichnung: { flex: 1, fontSize: 10, fontFamily: "Arimo", fontWeight: "bold" },
  rabattLine: {
    fontSize: 9,
    color: ANTHRACITE,
    paddingLeft: 150,
    marginTop: 1,
  },

  // ----- Unterschrift -----
  signatureBlock: {
    marginTop: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  signCell: { width: "44%", alignItems: "center" },
  signSpacer: {
    height: 36,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  signImage: {
    height: 36,
    objectFit: "contain",
  },
  signCity: {
    fontSize: 10,
    textAlign: "center",
  },
  signLine: {
    width: "100%",
    borderTopWidth: 0.8,
    borderTopColor: BORDER,
    paddingTop: 4,
    fontFamily: "Arimo", fontWeight: "bold",
    fontSize: 11,
    textAlign: "center",
  },

  // ----- Footer (zentriert, ohne Border-Top) -----
  footer: {
    position: "absolute",
    bottom: 24,
    left: 50,
    right: 50,
  },
  footerLine: { fontSize: 8.5, color: ANTHRACITE, textAlign: "center", lineHeight: 1.35 },
});

interface PdfProps {
  ls: LieferscheinWithPositions;
  signatureUrl: string | null;
  logoSrc?: string;
}

export function LieferscheinPdf({ ls, signatureUrl, logoSrc = "/pachlinger-logo.png" }: PdfProps) {
  return (
    <Document
      title={`Lieferschein ${ls.nummer}`}
      author="Pachlinger GmbH"
      subject={ls.betreff ?? "Lieferschein"}
    >
      <Page size="A4" style={styles.page}>
        {/* Reihe 1: Sender links · Logo rechts */}
        <View style={styles.topRow}>
          <View style={styles.senderBox}>
            <Text style={styles.senderName}>Pachlinger GmbH</Text>
            <Text style={styles.senderLine}>A-8833 Teufenbach-Katsch, Teuffenbachstr. 21</Text>
            <Text style={styles.senderLine}>Mobil: (0664) 52 46 079</Text>
            <Text style={styles.senderLine}>E-Mail: hannes@pachlinger.at</Text>
            <Text style={styles.senderLine}>www.pachlinger.at</Text>
            <Text style={styles.senderLine}>UID: AT U68725007</Text>
            <Text style={styles.senderLine}>FN 416356 p</Text>
          </View>

          <View style={styles.brandBox}>
            <Image src={logoSrc} style={styles.brandLogo} />
          </View>
        </View>

        {/* Reihe 2: Empfänger links · Meta-Tabelle rechts */}
        <View style={styles.middleRow}>
          <View style={styles.recipientBox}>
            <Text style={styles.recipientAddrLine}>
              Pachlinger GmbH, Teuffenbachstr. 21, 8833 Teufenbach-Katsch
            </Text>
            <Text style={styles.recipientText}>{ls.empfaenger_name}</Text>
            {ls.empfaenger_strasse ? (
              <Text style={styles.recipientText}>{ls.empfaenger_strasse}</Text>
            ) : null}
            {(ls.empfaenger_plz || ls.empfaenger_ort) && (
              <Text style={styles.recipientText}>
                {[ls.empfaenger_plz, ls.empfaenger_ort].filter(Boolean).join(" ")}
              </Text>
            )}
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaTable}>
              <View style={styles.metaTitleRow}>
                <Text style={styles.metaTitle}>LIEFERSCHEIN</Text>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaCellLabel}>
                  <Text>Lieferscheindatum:</Text>
                </View>
                <View style={styles.metaCellValue}>
                  <Text>{formatDateDe(ls.lieferschein_datum)}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaCellLabel}>
                  <Text>Lieferscheinnummer:</Text>
                </View>
                <View style={styles.metaCellValue}>
                  <Text>{ls.nummer}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaCellLabel}>
                  <Text>Kundennummer:</Text>
                </View>
                <View style={styles.metaCellValue}>
                  <Text>{ls.kunden_nummer ?? ""}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaCellLabel}>
                  <Text>Leistung:</Text>
                </View>
                <View style={styles.metaCellValue}>
                  <Text>{ls.leistung ?? ""}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaCellLabel}>
                  <Text>Ihre UID-Nr.:</Text>
                </View>
                <View style={styles.metaCellValue}>
                  <Text>{ls.empfaenger_uid ?? ""}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.pageOf}>Seite 1 von 1</Text>
          </View>
        </View>

        {/* Betreff */}
        {ls.betreff ? (
          <View style={styles.betreffRow}>
            <Text style={styles.betreffLabel}>Betreff:</Text>
            <Text style={styles.betreffText}>{ls.betreff}</Text>
          </View>
        ) : null}

        {/* Spaltenkopf (dünner Rahmen, kein grauer Hintergrund) */}
        <View style={styles.posHeaderRow}>
          <View style={[styles.colPos, styles.posHeaderDivider]}>
            <Text style={styles.posHeaderCell}>Pos.</Text>
          </View>
          <View style={[styles.colMenge, styles.posHeaderDivider]}>
            <Text style={styles.posHeaderCell}>Menge</Text>
          </View>
          <View style={[styles.colEinheit, styles.posHeaderDivider]}>
            <Text style={styles.posHeaderCell}>Einheit</Text>
          </View>
          <View style={styles.colBezeichnung}>
            <Text style={styles.posHeaderCell}>Bezeichnung</Text>
          </View>
        </View>

        {/* Angebot-Referenz */}
        {ls.angebot_nr ? (
          <Text style={styles.angebotLine}>
            Angebot Nr.: {ls.angebot_nr}
            {ls.angebot_datum ? ` vom ${formatDateDe(ls.angebot_datum)}` : ""}
          </Text>
        ) : null}

        {/* Bauseits */}
        {ls.bauseits.length > 0 ? (
          <View>
            <Text style={styles.bauseitsHeader}>Bauseits:</Text>
            {ls.bauseits.map((b, i) => (
              <Text key={i} style={styles.bauseitsItem}>
                •  {b}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Positionen — Rabatt-Zeile NUR wenn > 0 (Original zeigt 0,00 nicht) */}
        <View style={styles.positionsBlock}>
          {ls.positionen.map((p) => {
            const showRabatt =
              p.rabatt_eur !== null && p.rabatt_eur !== undefined && Number(p.rabatt_eur) > 0;
            return (
              <View key={p.id ?? p.pos_nr}>
                <View style={styles.positionRow}>
                  <Text style={styles.positionPos}>{p.pos_nr}</Text>
                  <Text style={styles.positionMenge}>
                    {Number(p.menge).toLocaleString("de-DE", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3,
                    })}
                  </Text>
                  <Text style={styles.positionEinheit}>{p.einheit}</Text>
                  <Text style={styles.positionBezeichnung}>{p.bezeichnung}</Text>
                </View>
                {showRabatt ? (
                  <Text style={styles.rabattLine}>
                    Rabatt EUR{" "}
                    {Number(p.rabatt_eur).toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Unterschrift */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signCell}>
            <View style={styles.signSpacer}>
              <Text style={styles.signCity}>
                {[ls.unterschrift_ort, formatDateDe(ls.unterschrift_datum)].filter(Boolean).join(", ")}
              </Text>
            </View>
            <Text style={styles.signLine}>(Ort, Datum)</Text>
          </View>
          <View style={styles.signCell}>
            <View style={styles.signSpacer}>
              {signatureUrl ? <Image src={signatureUrl} style={styles.signImage} /> : null}
            </View>
            <Text style={styles.signLine}>(Unterschrift)</Text>
          </View>
        </View>

        {/* Footer ohne Border-Top */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLine}>
            Bankverbindung: Die STEIERMÄRKISCHE Frojach | BLZ: 20815 | Kontonummer: 16200-001234
          </Text>
          <Text style={styles.footerLine}>IBAN: AT83 2081 5162 0000 1234 | BIC: STSPAT2GXXX</Text>
          <Text style={styles.footerLine}>
            Hinweis: Unsere Datenschutzerklärung ist jederzeit unter www.pachlinger.at abrufbar!
          </Text>
        </View>
      </Page>
    </Document>
  );
}
