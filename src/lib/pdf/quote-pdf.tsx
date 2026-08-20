import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatCents } from "@/lib/money";
import type { CustomerFacingQuoteDocument } from "./quote-document";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 120, height: 60, objectFit: "contain", marginBottom: 8 },
  businessBlock: { fontSize: 10, lineHeight: 1.4 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  quoteMeta: { alignItems: "flex-end" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, textTransform: "uppercase", color: "#666666", marginBottom: 4 },
  customerBlock: { fontSize: 10, lineHeight: 1.4 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
  },
  colDescription: { flex: 4 },
  colQuantity: { flex: 1, textAlign: "right" },
  colUnitPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totalsBlock: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    paddingVertical: 2,
  },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    marginTop: 4,
    fontWeight: 700,
  },
  footer: { marginTop: 32, fontSize: 9, color: "#666666" },
});

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

export function QuotePdfDocument({ quote }: { quote: CustomerFacingQuoteDocument }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            {quote.logoUrl ? (
              // @react-pdf/renderer's Image renders into a PDF, not the DOM; it has no alt prop.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={quote.logoUrl} style={styles.logo} />
            ) : null}
            <View style={styles.businessBlock}>
              {quote.businessName ? <Text>{quote.businessName}</Text> : null}
              {quote.businessAddress ? <Text>{quote.businessAddress}</Text> : null}
            </View>
          </View>
          <View style={styles.quoteMeta}>
            <Text style={styles.title}>Quote {quote.quoteNumber}</Text>
            <Text>Date: {DATE_FMT.format(quote.createdAt)}</Text>
            {quote.expiresAt ? <Text>Valid until: {DATE_FMT.format(quote.expiresAt)}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared For</Text>
          <View style={styles.customerBlock}>
            {quote.customerName ? <Text>{quote.customerName}</Text> : null}
            {quote.customerAddress ? <Text>{quote.customerAddress}</Text> : null}
          </View>
        </View>

        {quote.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text>{quote.description}</Text>
          </View>
        ) : null}

        <View>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQuantity}>Qty</Text>
            <Text style={styles.colUnitPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {quote.lineItems.map((item, i) => (
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
            <Text>{formatCents(quote.subtotalCents)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Tax</Text>
            <Text>{formatCents(quote.taxCents)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text>Total</Text>
            <Text>{formatCents(quote.totalCents)}</Text>
          </View>
        </View>

        {quote.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{quote.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
