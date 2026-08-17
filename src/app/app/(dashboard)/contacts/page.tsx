import Link from "next/link";
import { getDb } from "@/lib/db/client";
import {
  getPrimaryPhonesForContacts,
  listContacts,
  listDistinctContactSources,
} from "@/lib/crm/contacts";
import { formatPhoneForDisplay } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewContactDialog } from "./new-contact-dialog";
import { ContactFilters } from "./contact-filters";
import { ContactRowActions } from "./contact-row-actions";

const PAGE_SIZE = 25;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: "active" | "archived" | "all";
    source?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const [{ rows, total }, sources] = await Promise.all([
    listContacts(db, {
      search: params.search,
      status: params.status,
      source: params.source,
      page: params.page ? Number(params.page) : 1,
      pageSize: PAGE_SIZE,
    }),
    listDistinctContactSources(db),
  ]);

  const primaryPhones = await getPrimaryPhonesForContacts(
    db,
    rows.map((c) => c.id),
  );
  const contactsWithPhone = rows.map((contact) => ({
    ...contact,
    primaryPhone: primaryPhones.get(contact.id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
        <NewContactDialog />
      </div>

      <ContactFilters sources={sources} />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No contacts yet.
          <br />
          Use the <span className="font-medium text-foreground">+ New Contact</span> button above to
          add one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactsWithPhone.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                      {contact.displayName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.primaryPhone ? formatPhoneForDisplay(contact.primaryPhone) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.source ?? "—"}</TableCell>
                  <TableCell>
                    {contact.archivedAt ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ContactRowActions
                      contactId={contact.id}
                      archived={Boolean(contact.archivedAt)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
      ) : null}
    </div>
  );
}
