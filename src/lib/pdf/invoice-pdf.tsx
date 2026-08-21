import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatCents } from "@/lib/money";
import type { CustomerFacingInvoiceDocument } from "./invoice-document";

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

/**
 * Light tint of the accent color for table-header/section backgrounds.
 * @react-pdf/renderer has no CSS color-mix; accent colors are a fixed,
 * curated palette (src/lib/pdf/invoice-template.ts) so a hand-picked hex
 * tint per swatch is precise, but blending toward white by a fixed ratio
 * keeps this generic if the palette grows.
 */
function tint(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function buildStyles(accentColor: string, fontFamily: string) {
  const accentTint = tint(accentColor, 0.9);

  return StyleSheet.create({
    page: { fontSize: 10, fontFamily, color: "#1f2937" },
    headerBand: {
      backgroundColor: accentColor,
      paddingHorizontal: 40,
      paddingVertical: 24,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    logo: { width: 110, height: 50, objectFit: "contain", marginBottom: 8 },
    businessBlock: { fontSize: 9, lineHeight: 1.4, color: "#ffffff" },
    businessName: { fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 2 },
    invoiceMeta: { alignItems: "flex-end" },
    title: {
      fontSize: 22,
      fontWeight: 700,
      color: "#ffffff",
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    metaLine: { fontSize: 9, color: "#ffffff", opacity: 0.9 },
    body: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 40 },
    section: { marginBottom: 16 },
    sectionTitle: {
      fontSize: 8,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: accentColor,
      fontWeight: 700,
      marginBottom: 5,
    },
    customerBlock: { fontSize: 10, lineHeight: 1.45 },
    tableHeaderRow: {
      flexDirection: "row",
      backgroundColor: accentTint,
      paddingVertical: 6,
      paddingHorizontal: 8,
      marginBottom: 2,
    },
    tableHeaderText: {
      fontSize: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      fontWeight: 700,
      color: accentColor,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e7eb",
    },
    colDescription: { flex: 4 },
    colQuantity: { flex: 1, textAlign: "right" },
    colUnitPrice: { flex: 1.5, textAlign: "right" },
    colTotal: { flex: 1.5, textAlign: "right" },
    totalsBlock: { marginTop: 14, alignItems: "flex-end" },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: 220,
      paddingVertical: 3,
      color: "#4b5563",
    },
    totalsRowFinal: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: 220,
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: accentColor,
      marginTop: 6,
      fontWeight: 700,
      color: "#ffffff",
    },
    footer: {
      marginTop: 32,
      paddingTop: 12,
      borderTopWidth: 0.5,
      borderTopColor: "#e5e7eb",
      fontSize: 8,
      color: "#9ca3af",
      textAlign: "center",
    },
  });
}

export function InvoicePdfDocument({ invoice }: { invoice: CustomerFacingInvoiceDocument }) {
  const styles = buildStyles(invoice.accentColor, invoice.fontFamily);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerBand}>
          <View>
            {invoice.logoUrl ? (
              // @react-pdf/renderer's Image renders into a PDF, not the DOM; it has no alt prop.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={invoice.logoUrl} style={styles.logo} />
            ) : null}
            <View style={styles.businessBlock}>
              {invoice.businessName ? (
                <Text style={styles.businessName}>{invoice.businessName}</Text>
              ) : null}
              {invoice.businessAddress ? <Text>{invoice.businessAddress}</Text> : null}
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.metaLine}>No. {invoice.invoiceNumber}</Text>
            <Text style={styles.metaLine}>Date: {DATE_FMT.format(invoice.createdAt)}</Text>
            <Text style={styles.metaLine}>Job: {invoice.jobNumber}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <View style={styles.customerBlock}>
              {invoice.customerName ? <Text>{invoice.customerName}</Text> : null}
              {invoice.customerAddress ? <Text>{invoice.customerAddress}</Text> : null}
            </View>
          </View>

          <View>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colDescription, styles.tableHeaderText]}>Description</Text>
              <Text style={[styles.colQuantity, styles.tableHeaderText]}>Qty</Text>
              <Text style={[styles.colUnitPrice, styles.tableHeaderText]}>Unit Price</Text>
              <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
            </View>
            {invoice.lineItems.map((item, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={styles.colDescription}>{item.description}</Text>
                <Text style={styles.colQuantity}>{item.quantity}</Text>
                <Text style={styles.colUnitPrice}>{formatCents(item.unitPriceCents)}</Text>
                <Text style={styles.colTotal}>{formatCents(item.lineTotalCents)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatCents(invoice.subtotalCents)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text>Tax</Text>
              <Text>{formatCents(invoice.taxCents)}</Text>
            </View>
            <View style={styles.totalsRowFinal}>
              <Text>Total Due</Text>
              <Text>{formatCents(invoice.totalCents)}</Text>
            </View>
          </View>

          {invoice.paymentInstructions ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Instructions</Text>
              <Text>{invoice.paymentInstructions}</Text>
            </View>
          ) : null}

          {invoice.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text>{invoice.notes}</Text>
            </View>
          ) : null}

          {invoice.footer ? <Text style={styles.footer}>{invoice.footer}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
