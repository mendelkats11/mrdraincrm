"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { normalizePhone } from "@/lib/phone";
import {
  addContactEmail,
  addContactPhone,
  listContacts,
  archiveContact,
  createContact,
  removeContactEmail,
  removeContactPhone,
  unarchiveContact,
  updateContact,
} from "./contacts";
import {
  attachContactToOrganization,
  attachContactToProperty,
  detachContactFromOrganization,
  detachContactFromProperty,
} from "./relationships";
import { mergeContacts } from "./merge";
import { listOrganizations } from "./organizations";
import { listProperties } from "./properties";
import { contactPropertyRoleEnum } from "@/lib/db/schema";

const phoneField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || normalizePhone(v) !== null, "Enter a valid phone number");
const emailField = z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]);

const contactSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required"),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  source: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  phone: phoneField,
  email: emailField.optional(),
});

export type ContactFormState =
  { ok: true; contactId: string } | { ok: false; error: string } | undefined;

export async function createContactAction(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const session = await requireUser();
  const parsed = contactSchema.safeParse({
    displayName: formData.get("displayName"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const contact = await createContact(
    db,
    {
      displayName: parsed.data.displayName,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName || null,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
      phone: parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      email: parsed.data.email || null,
    },
    session.user.id,
  );

  revalidatePath("/contacts");
  return { ok: true, contactId: contact.id };
}

const updateContactSchema = z.object({
  contactId: z.string().uuid(),
  displayName: z.string().trim().min(1, "Name is required"),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  source: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function updateContactAction(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const session = await requireUser();
  const parsed = updateContactSchema.safeParse({
    contactId: formData.get("contactId"),
    displayName: formData.get("displayName"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateContact(
    db,
    parsed.data.contactId,
    {
      displayName: parsed.data.displayName,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName || null,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
    },
    session.user.id,
  );

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${parsed.data.contactId}`);
  return { ok: true, contactId: parsed.data.contactId };
}

export async function archiveContactAction(contactId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await archiveContact(db, contactId, session.user.id);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}

export async function unarchiveContactAction(contactId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await unarchiveContact(db, contactId, session.user.id);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}

const addPhoneSchema = z.object({
  contactId: z.string().uuid(),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizePhone(v) !== null, "Enter a valid phone number"),
  label: z.string().trim().optional(),
});

export type SimpleFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function addContactPhoneAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = addPhoneSchema.safeParse({
    contactId: formData.get("contactId"),
    phone: formData.get("phone"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const normalized = normalizePhone(parsed.data.phone)!;
  const db = getDb();
  await addContactPhone(
    db,
    parsed.data.contactId,
    normalized,
    parsed.data.label || null,
    session.user.id,
  );
  revalidatePath(`/contacts/${parsed.data.contactId}`);
  return { ok: true };
}

export async function removeContactPhoneAction(contactId: string, phoneId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await removeContactPhone(db, contactId, phoneId, session.user.id);
  revalidatePath(`/contacts/${contactId}`);
}

const addEmailSchema = z.object({
  contactId: z.string().uuid(),
  email: z.string().trim().email("Enter a valid email address"),
  label: z.string().trim().optional(),
});

export async function addContactEmailAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = addEmailSchema.safeParse({
    contactId: formData.get("contactId"),
    email: formData.get("email"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const db = getDb();
  await addContactEmail(
    db,
    parsed.data.contactId,
    parsed.data.email,
    parsed.data.label || null,
    session.user.id,
  );
  revalidatePath(`/contacts/${parsed.data.contactId}`);
  return { ok: true };
}

export async function removeContactEmailAction(contactId: string, emailId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await removeContactEmail(db, contactId, emailId, session.user.id);
  revalidatePath(`/contacts/${contactId}`);
}

const attachOrgSchema = z.object({
  contactId: z.string().uuid(),
  organizationId: z.string().uuid("Choose an organization"),
  title: z.string().trim().optional(),
});

export async function attachContactToOrganizationAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = attachOrgSchema.safeParse({
    contactId: formData.get("contactId"),
    organizationId: formData.get("organizationId"),
    title: formData.get("title") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const db = getDb();
  await attachContactToOrganization(
    db,
    parsed.data.organizationId,
    parsed.data.contactId,
    parsed.data.title || null,
    session.user.id,
  );
  revalidatePath(`/contacts/${parsed.data.contactId}`);
  revalidatePath(`/organizations/${parsed.data.organizationId}`);
  return { ok: true };
}

export async function detachContactFromOrganizationAction(
  contactId: string,
  organizationId: string,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await detachContactFromOrganization(db, organizationId, contactId, session.user.id);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/organizations/${organizationId}`);
}

const attachPropertySchema = z.object({
  contactId: z.string().uuid(),
  propertyId: z.string().uuid("Choose a property"),
  role: z.enum(contactPropertyRoleEnum.enumValues),
});

export async function attachContactToPropertyAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = attachPropertySchema.safeParse({
    contactId: formData.get("contactId"),
    propertyId: formData.get("propertyId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const db = getDb();
  await attachContactToProperty(
    db,
    parsed.data.propertyId,
    parsed.data.contactId,
    parsed.data.role,
    session.user.id,
  );
  revalidatePath(`/contacts/${parsed.data.contactId}`);
  revalidatePath(`/properties/${parsed.data.propertyId}`);
  return { ok: true };
}

export async function detachContactFromPropertyAction(
  contactId: string,
  propertyId: string,
): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await detachContactFromProperty(db, propertyId, contactId, session.user.id);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/properties/${propertyId}`);
}

const mergeSchema = z.object({
  keepContactId: z.string().uuid(),
  archiveContactId: z.string().uuid("Choose a contact to merge"),
});

export type MergeFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function mergeContactsAction(
  _prevState: MergeFormState,
  formData: FormData,
): Promise<MergeFormState> {
  const session = await requireUser();
  const parsed = mergeSchema.safeParse({
    keepContactId: formData.get("keepContactId"),
    archiveContactId: formData.get("archiveContactId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await mergeContacts(
    db,
    parsed.data.keepContactId,
    parsed.data.archiveContactId,
    session.user.id,
  );

  if (!result.ok) {
    const messages: Record<typeof result.error, string> = {
      same_contact: "Choose a different contact to merge.",
      keep_not_found: "The contact to keep could not be found.",
      archive_not_found: "The contact to merge could not be found.",
      keep_already_archived: "The contact to keep is archived.",
      archive_already_archived: "That contact is already archived.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${parsed.data.keepContactId}`);
  revalidatePath(`/contacts/${parsed.data.archiveContactId}`);
  return { ok: true };
}

export interface ContactSearchResult {
  id: string;
  displayName: string;
}

/** Powers the merge-target picker — active contacts only, excluding the current one. */
export async function searchContactsForMergeAction(
  query: string,
  excludeContactId: string,
): Promise<ContactSearchResult[]> {
  await requireUser();
  if (!query.trim()) return [];
  const db = getDb();
  const { rows } = await listContacts(db, { search: query, status: "active", pageSize: 10 });
  return rows
    .filter((r) => r.id !== excludeContactId)
    .map((r) => ({ id: r.id, displayName: r.displayName }));
}

/** General contact picker — powers "attach a contact" from the organization/property side. */
export async function searchContactsAction(query: string): Promise<ContactSearchResult[]> {
  await requireUser();
  if (!query.trim()) return [];
  const db = getDb();
  const { rows } = await listContacts(db, { search: query, status: "active", pageSize: 10 });
  return rows.map((r) => ({ id: r.id, displayName: r.displayName }));
}

export interface OrganizationSearchResult {
  id: string;
  name: string;
}

export async function searchOrganizationsAction(
  query: string,
): Promise<OrganizationSearchResult[]> {
  await requireUser();
  if (!query.trim()) return [];
  const db = getDb();
  const { rows } = await listOrganizations(db, { search: query, status: "active", pageSize: 10 });
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export interface PropertySearchResult {
  id: string;
  addressLine1: string;
  city: string;
}

export async function searchPropertiesAction(query: string): Promise<PropertySearchResult[]> {
  await requireUser();
  if (!query.trim()) return [];
  const db = getDb();
  const { rows } = await listProperties(db, { search: query, status: "active", pageSize: 10 });
  return rows.map((r) => ({ id: r.id, addressLine1: r.addressLine1, city: r.city }));
}
