import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  contactPropertyRoleEnum,
  contacts,
  organizationContacts,
  organizations,
  propertyContacts,
  properties,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type ContactPropertyRole = (typeof contactPropertyRoleEnum.enumValues)[number];

// ---- Contact <-> Organization -------------------------------------------

/** Idempotent: attaching an already-attached contact updates the title. */
export async function attachContactToOrganization<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  organizationId: string,
  contactId: string,
  title: string | null,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: organizationContacts.id })
      .from(organizationContacts)
      .where(
        and(
          eq(organizationContacts.organizationId, organizationId),
          eq(organizationContacts.contactId, contactId),
        ),
      );

    if (existing) {
      await tx
        .update(organizationContacts)
        .set({ title })
        .where(eq(organizationContacts.id, existing.id));
    } else {
      await tx.insert(organizationContacts).values({ organizationId, contactId, title });
    }

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_attached_to_organization",
      metadata: { organizationId, title },
    });
    await recordActivity(tx, {
      actorUserId,
      entityType: "organization",
      entityId: organizationId,
      action: "contact_attached_to_organization",
      metadata: { contactId, title },
    });
  });
}

export async function detachContactFromOrganization<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  organizationId: string,
  contactId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    await tx
      .delete(organizationContacts)
      .where(
        and(
          eq(organizationContacts.organizationId, organizationId),
          eq(organizationContacts.contactId, contactId),
        ),
      );

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_detached_from_organization",
      metadata: { organizationId },
    });
    await recordActivity(tx, {
      actorUserId,
      entityType: "organization",
      entityId: organizationId,
      action: "contact_detached_from_organization",
      metadata: { contactId },
    });
  });
}

export async function listOrganizationContacts<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  organizationId: string,
) {
  return db
    .select({
      id: organizationContacts.id,
      contactId: contacts.id,
      displayName: contacts.displayName,
      title: organizationContacts.title,
    })
    .from(organizationContacts)
    .innerJoin(contacts, eq(organizationContacts.contactId, contacts.id))
    .where(eq(organizationContacts.organizationId, organizationId));
}

export async function listContactOrganizations<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
) {
  return db
    .select({
      id: organizationContacts.id,
      organizationId: organizations.id,
      name: organizations.name,
      title: organizationContacts.title,
    })
    .from(organizationContacts)
    .innerJoin(organizations, eq(organizationContacts.organizationId, organizations.id))
    .where(eq(organizationContacts.contactId, contactId));
}

// ---- Contact <-> Property -------------------------------------------------

/** Idempotent: attaching an already-attached contact updates the role. */
export async function attachContactToProperty<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  propertyId: string,
  contactId: string,
  role: ContactPropertyRole,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: propertyContacts.id })
      .from(propertyContacts)
      .where(
        and(eq(propertyContacts.propertyId, propertyId), eq(propertyContacts.contactId, contactId)),
      );

    if (existing) {
      await tx.update(propertyContacts).set({ role }).where(eq(propertyContacts.id, existing.id));
    } else {
      await tx.insert(propertyContacts).values({ propertyId, contactId, role });
    }

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_attached_to_property",
      metadata: { propertyId, role },
    });
    await recordActivity(tx, {
      actorUserId,
      entityType: "property",
      entityId: propertyId,
      action: "contact_attached_to_property",
      metadata: { contactId, role },
    });
  });
}

export async function detachContactFromProperty<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  propertyId: string,
  contactId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    await tx
      .delete(propertyContacts)
      .where(
        and(eq(propertyContacts.propertyId, propertyId), eq(propertyContacts.contactId, contactId)),
      );

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_detached_from_property",
      metadata: { propertyId },
    });
    await recordActivity(tx, {
      actorUserId,
      entityType: "property",
      entityId: propertyId,
      action: "contact_detached_from_property",
      metadata: { contactId },
    });
  });
}

export async function listPropertyContacts<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  propertyId: string,
) {
  return db
    .select({
      id: propertyContacts.id,
      contactId: contacts.id,
      displayName: contacts.displayName,
      role: propertyContacts.role,
    })
    .from(propertyContacts)
    .innerJoin(contacts, eq(propertyContacts.contactId, contacts.id))
    .where(eq(propertyContacts.propertyId, propertyId));
}

export async function listContactProperties<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
) {
  return db
    .select({
      id: propertyContacts.id,
      propertyId: properties.id,
      addressLine1: properties.addressLine1,
      city: properties.city,
      role: propertyContacts.role,
    })
    .from(propertyContacts)
    .innerJoin(properties, eq(propertyContacts.propertyId, properties.id))
    .where(eq(propertyContacts.contactId, contactId));
}

export async function listOrganizationProperties<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  organizationId: string,
) {
  return db
    .select({
      id: properties.id,
      addressLine1: properties.addressLine1,
      city: properties.city,
      propertyType: properties.propertyType,
    })
    .from(properties)
    .where(eq(properties.organizationId, organizationId));
}
