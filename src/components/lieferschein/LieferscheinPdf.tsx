import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { LieferscheinWithPositions, formatDateDe } from "@/lib/lieferschein";

const PACHLINGER_RED = "#D9201E";
const PACHLINGER_ORANGE = "#F26B1F";
const ANTHRACITE = "#1F2429";
const BORDER = "#1F2429";
const MUTED = "#6B7280";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: ANTHRACITE,
    lineHeight: 1.35,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  senderBlock: {
    flexDirection: "column",
    width: "55%",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  brandPachlinger: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: PACHLINGER_RED,
    letterSpacing: -0.5,
  },
  brandSuffix: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: ANTHRACITE,
    marginLeft: 4,
  },
  brandTagline: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: PACHLINGER_RED,
    marginBottom: 4,
  },
  brandSubtagline: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: PACHLINGER_ORANGE,
    marginBottom: 6,
  },
  senderInfo: { fontSize: 9, lineHeight: 1.4 },
  recipientBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  recipientLeft: { width: "55%" },
  recipientLine: {
    fontSize: 8,
    color: MUTED,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingBottom: 1,
    marginBottom: 5,
  },
  recipientName: { fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: 1 },
  recipientText: { fontSize: 11 },
  metaTable: {
    width: "42%",
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  metaTitleRow: {
    backgroundColor: ANTHRACITE,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  metaTitle: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  metaRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
  },
  metaCellLabel: {
    width: "55%",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: BORDER,
    fontFamily: "Helvetica-Bold",
  },
  metaCellValue: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  page1Of1: {
    fontSize: 8,
    color: MUTED,
    textAlign: "right",
    marginTop: 2,
  },
  betreffRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 14,
    marginBottom: 8,
  },
  betreffLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    textDecoration: "underline",
    marginRight: 12,
  },
  betreffText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  posHeaderRow: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: BORDER,
    backgroundColor: "#F2F2F2",
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 0,
  },
  posHeaderCell: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  colPos: { width: 28 },
  colMenge: { width: 38, textAlign: "right", paddingRight: 4 },
  colEinheit: { width: 40 },
  colBezeichnung: { flex: 1 },
  angebotLine: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  bauseitsHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 12,
    marginBottom: 2,
  },
  bauseitsItem: {
    fontSize: 10,
    marginLeft: 14,
  },
  positionsBlock: { marginTop: 16 },
  positionRow: {
    flexDirection: "row",
    paddingVertical: 6,
    alignItems: "flex-start",
  },
  positionPos: { width: 28, fontSize: 10 },
  positionMenge: { width: 38, fontSize: 10, textAlign: "right", paddingRight: 4 },
  positionEinheit: { width: 40, fontSize: 10 },
  positionBezeichnung: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold" },
  rabattLine: { fontSize: 9, color: MUTED, marginLeft: 106, marginTop: 2 },
  signatureBlock: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  signCell: { width: "45%", alignItems: "center" },
  signLine: {
    width: "100%",
    borderTopWidth: 0.7,
    borderTopColor: BORDER,
    paddingTop: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
  },
  signImage: {
    height: 50,
    marginBottom: 2,
    objectFit: "contain",
  },
  signCity: {
    fontSize: 10,
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

interface PdfProps {
  ls: LieferscheinWithPositions;
  signatureUrl: string | null;
}

export function LieferscheinPdf({ ls, signatureUrl }: PdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topRow}>
          <View style={styles.senderBlock}>
            <View style={styles.brandRow}>
              <Text style={styles.brandPachlinger}>Pachlinger</Text>
              <Text style={styles.brandSuffix}>GmbH</Text>
            </View>
            <Text style={styles.brandTagline}>LÜFTUNG · ENTFEUCHTUNG · KLIMA</Text>
            <Text style={styles.brandSubtagline}>WÄRMERÜCKGEWINNUNG · ARBEITSBÜHNEN</Text>
            <Text style={styles.senderInfo}>Pachlinger GmbH</Text>
            <Text style={styles.senderInfo}>A-8833 Teufenbach-Katsch, Teuffenbachstr. 21</Text>
            <Text style={styles.senderInfo}>Mobil: (0664) 52 46 079</Text>
            <Text style={styles.senderInfo}>E-Mail: hannes@pachlinger.at</Text>
            <Text style={styles.senderInfo}>www.pachlinger.at</Text>
            <Text style={styles.senderInfo}>UID: AT U68725007 · FN 416356 p</Text>
          </View>
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
        </View>

        <View style={styles.recipientBlock}>
          <View style={styles.recipientLeft}>
            <Text style={styles.recipientLine}>
              Pachlinger GmbH, Teuffenbachstr. 21, 8833 Teufenbach-Katsch
            </Text>
            <Text style={styles.recipientName}>{ls.empfaenger_name}</Text>
            {ls.empfaenger_strasse ? (
              <Text style={styles.recipientText}>{ls.empfaenger_strasse}</Text>
            ) : null}
            {(ls.empfaenger_plz || ls.empfaenger_ort) && (
              <Text style={styles.recipientText}>
                {[ls.empfaenger_plz, ls.empfaenger_ort].filter(Boolean).join(" ")}
              </Text>
            )}
          </View>
          <Text style={styles.page1Of1}>Seite 1 von 1</Text>
        </View>

        {ls.betreff && (
          <View style={styles.betreffRow}>
            <Text style={styles.betreffLabel}>Betreff:</Text>
            <Text style={styles.betreffText}>{ls.betreff}</Text>
          </View>
        )}

        <View style={styles.posHeaderRow}>
          <Text style={[styles.posHeaderCell, styles.colPos]}>Pos.</Text>
          <Text style={[styles.posHeaderCell, styles.colMenge]}>Menge</Text>
          <Text style={[styles.posHeaderCell, styles.colEinheit]}>Einheit</Text>
          <Text style={[styles.posHeaderCell, styles.colBezeichnung]}>Bezeichnung</Text>
        </View>

        {ls.angebot_nr && (
          <Text style={styles.angebotLine}>
            Angebot Nr.: {ls.angebot_nr}
            {ls.angebot_datum ? ` vom ${formatDateDe(ls.angebot_datum)}` : ""}
          </Text>
        )}

        {ls.bauseits.length > 0 && (
          <View>
            <Text style={styles.bauseitsHeader}>Bauseits:</Text>
            {ls.bauseits.map((b, i) => (
              <Text key={i} style={styles.bauseitsItem}>
                · {b}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.positionsBlock}>
          {ls.positionen.map((p) => (
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
              {p.rabatt_eur !== null && p.rabatt_eur !== undefined && (
                <Text style={styles.rabattLine}>
                  Rabatt EUR {Number(p.rabatt_eur).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signCell}>
            {ls.unterschrift_ort || ls.unterschrift_datum ? (
              <Text style={styles.signCity}>
                {[ls.unterschrift_ort, formatDateDe(ls.unterschrift_datum)].filter(Boolean).join(", ")}
              </Text>
            ) : null}
            <Text style={styles.signLine}>(Ort, Datum)</Text>
          </View>
          <View style={styles.signCell}>
            {signatureUrl ? <Image src={signatureUrl} style={styles.signImage} /> : null}
            <Text style={styles.signLine}>(Unterschrift)</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Bankverbindung: Die STEIERMÄRKISCHE Frojach | BLZ: 20815 | Kontonummer: 16200-001234{"\n"}
          IBAN: AT83 2081 5162 0000 1234 | BIC: STSPAT2GXXX{"\n"}
          Hinweis: Unsere Datenschutzerklärung ist jederzeit unter www.pachlinger.at abrufbar!
        </Text>
      </Page>
    </Document>
  );
}
