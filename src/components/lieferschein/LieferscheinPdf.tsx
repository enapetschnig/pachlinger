import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { LieferscheinWithPositions } from "@/lib/lieferschein";
import { formatDateDe } from "@/lib/lieferschein-format";

const PACHLINGER_RED = "#D9201E";
const PACHLINGER_ORANGE = "#F26B1F";
const ANTHRACITE = "#1F2429";
const BORDER = "#1F2429";
const MUTED = "#5F6770";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 56,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: ANTHRACITE,
    lineHeight: 1.25,
  },

  // ----- Reihe 1: Sender (links) + Brand/Logo (rechts) -----
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  senderBox: { width: "55%" },
  senderLine: { fontSize: 9, lineHeight: 1.4 },

  brandBox: {
    width: "42%",
    alignItems: "flex-end",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  brandPachlinger: {
    fontFamily: "Helvetica-BoldOblique",
    fontSize: 26,
    color: PACHLINGER_RED,
    letterSpacing: -0.5,
  },
  brandSuffix: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: ANTHRACITE,
    marginLeft: 4,
  },
  brandUndTeam: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 12,
    color: ANTHRACITE,
    marginTop: 1,
  },
  brandTagBar: {
    marginTop: 6,
    backgroundColor: PACHLINGER_RED,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  brandTagText: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 0.4,
  },
  brandTagBar2: {
    backgroundColor: PACHLINGER_ORANGE,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  brandHotline: {
    marginTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: PACHLINGER_RED,
  },

  // ----- Reihe 2: Empfänger (links) + Meta-Tabelle (rechts) -----
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  recipientBox: { width: "55%", paddingTop: 8 },
  recipientAddrLine: {
    fontSize: 8,
    color: MUTED,
    borderBottomWidth: 0.5,
    borderBottomColor: MUTED,
    paddingBottom: 1,
    marginBottom: 8,
  },
  recipientName: { fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 1 },
  recipientText: { fontFamily: "Helvetica-Bold", fontSize: 13 },

  metaBox: { width: "42%" },
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
    fontFamily: "Helvetica-Bold",
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
  },
  pageOf: {
    fontSize: 8,
    color: MUTED,
    textAlign: "right",
    marginTop: 3,
  },

  // ----- Betreff -----
  betreffRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
    marginBottom: 8,
  },
  betreffLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    textDecoration: "underline",
    marginRight: 14,
  },
  betreffText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },

  // ----- Spaltenkopf "Pos. Menge Einheit Bezeichnung" -----
  posHeaderRow: {
    flexDirection: "row",
    borderTopWidth: 0.7,
    borderBottomWidth: 0.7,
    borderColor: BORDER,
    paddingVertical: 3,
    backgroundColor: "#F2F2F2",
  },
  posHeaderCell: { fontSize: 8.5, fontFamily: "Helvetica-Bold", paddingHorizontal: 4 },
  colPos: { width: 28 },
  colMenge: { width: 50, textAlign: "right", paddingRight: 6 },
  colEinheit: { width: 46 },
  colBezeichnung: { flex: 1 },

  angebotLine: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 6,
    marginBottom: 2,
    paddingLeft: 70,
  },
  bauseitsHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 8,
    marginBottom: 1,
    paddingLeft: 70,
  },
  bauseitsItem: {
    fontSize: 10,
    paddingLeft: 86,
  },

  positionsBlock: { marginTop: 10 },
  positionRow: {
    flexDirection: "row",
    paddingVertical: 2,
    alignItems: "flex-start",
  },
  positionPos: { width: 28, fontSize: 10, paddingHorizontal: 4 },
  positionMenge: { width: 50, fontSize: 10, textAlign: "right", paddingRight: 6 },
  positionEinheit: { width: 46, fontSize: 10, paddingLeft: 4 },
  positionBezeichnung: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold" },
  rabattLine: {
    fontSize: 9,
    color: MUTED,
    paddingLeft: 132,
    marginTop: 0,
    marginBottom: 2,
  },

  // ----- Unterschrift -----
  signatureBlock: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  signCell: { width: "44%", alignItems: "center" },
  signSpacer: {
    height: 40,
    width: "100%",
  },
  signImage: {
    height: 40,
    marginBottom: 2,
    objectFit: "contain",
  },
  signCity: {
    fontSize: 10,
    marginBottom: 2,
    textAlign: "center",
  },
  signLine: {
    width: "100%",
    borderTopWidth: 0.7,
    borderTopColor: BORDER,
    paddingTop: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
  },

  // ----- Footer -----
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
  },
  footerLine: { fontSize: 8, color: MUTED, textAlign: "center" },
});

interface PdfProps {
  ls: LieferscheinWithPositions;
  signatureUrl: string | null;
}

export function LieferscheinPdf({ ls, signatureUrl }: PdfProps) {
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
            <Text style={styles.senderLine}>Pachlinger GmbH</Text>
            <Text style={styles.senderLine}>A-8833 Teufenbach-Katsch, Teuffenbachstr. 21</Text>
            <Text style={styles.senderLine}>Mobil: (0664) 52 46 079</Text>
            <Text style={styles.senderLine}>E-Mail: hannes@pachlinger.at</Text>
            <Text style={styles.senderLine}>www.pachlinger.at</Text>
            <Text style={styles.senderLine}>UID: AT U68725007</Text>
            <Text style={styles.senderLine}>FN 416356 p</Text>
          </View>

          <View style={styles.brandBox}>
            <View style={styles.brandRow}>
              <Text style={styles.brandPachlinger}>Pachlinger</Text>
              <Text style={styles.brandSuffix}>GmbH</Text>
            </View>
            <Text style={styles.brandUndTeam}>...und Team</Text>
            <View style={styles.brandTagBar}>
              <Text style={styles.brandTagText}>LÜFTUNG · ENTFEUCHTUNG · KLIMA</Text>
            </View>
            <View style={styles.brandTagBar2}>
              <Text style={styles.brandTagText}>WÄRMERÜCKGEWINNUNG · ARBEITSBÜHNEN</Text>
            </View>
            <Text style={styles.brandHotline}>Lüftungshotline: (0664) 5246079</Text>
          </View>
        </View>

        {/* Reihe 2: Empfänger links · Meta-Tabelle rechts */}
        <View style={styles.middleRow}>
          <View style={styles.recipientBox}>
            <Text style={styles.recipientAddrLine}>
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

        {/* Spaltenkopf */}
        <View style={styles.posHeaderRow}>
          <Text style={[styles.posHeaderCell, styles.colPos]}>Pos.</Text>
          <Text style={[styles.posHeaderCell, styles.colMenge]}>Menge</Text>
          <Text style={[styles.posHeaderCell, styles.colEinheit]}>Einheit</Text>
          <Text style={[styles.posHeaderCell, styles.colBezeichnung]}>Bezeichnung</Text>
        </View>

        {/* Angebot-Referenz (zwischen Header und Bauseits, wie im Original) */}
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

        {/* Positionen */}
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
              {p.rabatt_eur !== null && p.rabatt_eur !== undefined ? (
                <Text style={styles.rabattLine}>
                  Rabatt EUR{" "}
                  {Number(p.rabatt_eur).toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              ) : null}
            </View>
          ))}
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

        {/* Footer mit Bankverbindung */}
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
