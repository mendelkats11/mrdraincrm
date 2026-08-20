import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatCents } from "@/lib/money";
import type { CustomerFacingInvoiceDocument } from "./invoice-document";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 120, height: 60, objectFit: "contain", marginBottom: 8 },
  businessBlock: { fontSize: 10, lineHeight: 1.4 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  invoiceMeta: { alignItems: "flex-end" },
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

export function InvoicePdfDocument({ invoice }: { invoice: CustomerFacingInvoiceDocument }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            {invoice.logoUrl ? (
              // @react-pdf/renderer's Image renders into a PDF, not the DOM; it has no alt prop.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={invoice.logoUrl} style={styles.logo} />
            ) : null}
            <View style={styles.businessBlock}>
              {invoice.businessName ? <Text>{invoice.businessName}</Text> : null}
              {invoice.businessAddress ? <Text>{invoice.businessAddress}</Text> : null}
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.title}>Invoice {invoice.invoiceNumber}</Text>
            <Text>Date: {DATE_FMT.format(invoice.createdAt)}</Text>
            <Text>Job: {invoice.jobNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <View style={styles.customerBlock}>
            {invoice.customerName ? <Text>{invoice.customerName}</Text> : null}
            {invoice.customerAddress ? <Text>{invoice.customerAddress}</Text> : null}
          </View>
        </View>

        <View>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQuantity}>Qty</Text>
            <Text style={styles.colUnitPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
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
            <Text>Total</Text>
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
      </Page>
    </Document>
  );
}
