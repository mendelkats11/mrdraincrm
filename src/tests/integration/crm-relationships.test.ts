// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createContact } from "@/lib/crm/contacts";
import { createOrganization } from "@/lib/crm/organizations";
import { createProperty } from "@/lib/crm/properties";
import {
  attachContactToOrganization,
  attachContactToProperty,
  detachContactFromOrganization,
  detachContactFromProperty,
  listContactOrganizations,
  listContactProperties,
  listOrganizationContacts,
  listOrganizationProperties,
  listPropertyContacts,
} from "@/lib/crm/relationships";

const propertyInput = {
  addressLine1: "1 Main St",
  city: "Warman",
  province: "SK",
  postalCode: "S0K 0A0",
};

describe("CRM relationships", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("attaches a contact to an organization and lists it both ways", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);

    await attachContactToOrganization(ctx.db, org.id, contact.id, "Property Manager", null);

    const orgContacts = await listOrganizationContacts(ctx.db, org.id);
    expect(orgContacts).toHaveLength(1);
    expect(orgContacts[0].title).toBe("Property Manager");

    const contactOrgs = await listContactOrganizations(ctx.db, contact.id);
    expect(contactOrgs).toHaveLength(1);
    expect(contactOrgs[0].name).toBe("Acme");
  });

  it("attaching the same contact/org pair twice updates the title instead of erroring", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);

    await attachContactToOrganization(ctx.db, org.id, contact.id, "Manager", null);
    await attachContactToOrganization(ctx.db, org.id, contact.id, "Senior Manager", null);

    const orgContacts = await listOrganizationContacts(ctx.db, org.id);
    expect(orgContacts).toHaveLength(1);
    expect(orgContacts[0].title).toBe("Senior Manager");
  });

  it("detaches a contact from an organization", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);
    await attachContactToOrganization(ctx.db, org.id, contact.id, null, null);

    await detachContactFromOrganization(ctx.db, org.id, contact.id, null);
    expect(await listOrganizationContacts(ctx.db, org.id)).toHaveLength(0);
  });

  it("a person can belong to an organization while also having a personal property — docs/PROJECT_SPEC.md §6.2", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);
    const personalProperty = await createProperty(ctx.db, propertyInput, null);

    await attachContactToOrganization(ctx.db, org.id, contact.id, "Owner", null);
    await attachContactToProperty(ctx.db, personalProperty.id, contact.id, "owner", null);

    expect(await listContactOrganizations(ctx.db, contact.id)).toHaveLength(1);
    const contactProps = await listContactProperties(ctx.db, contact.id);
    expect(contactProps).toHaveLength(1);
    expect(contactProps[0].role).toBe("owner");
  });

  it("a property can have multiple contacts with different roles — ROADMAP.md Phase 3 acceptance", async () => {
    const owner = await createContact(ctx.db, { displayName: "Owner Person" }, null);
    const tenant = await createContact(ctx.db, { displayName: "Tenant Person" }, null);
    const property = await createProperty(ctx.db, propertyInput, null);

    await attachContactToProperty(ctx.db, property.id, owner.id, "owner", null);
    await attachContactToProperty(ctx.db, property.id, tenant.id, "tenant", null);

    const propertyContacts = await listPropertyContacts(ctx.db, property.id);
    expect(propertyContacts).toHaveLength(2);
    expect(propertyContacts.map((c) => c.role).sort()).toEqual(["owner", "tenant"]);
  });

  it("re-attaching updates the role instead of creating a duplicate row", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    const property = await createProperty(ctx.db, propertyInput, null);

    await attachContactToProperty(ctx.db, property.id, contact.id, "tenant", null);
    await attachContactToProperty(ctx.db, property.id, contact.id, "owner", null);

    const propertyContacts = await listPropertyContacts(ctx.db, property.id);
    expect(propertyContacts).toHaveLength(1);
    expect(propertyContacts[0].role).toBe("owner");
  });

  it("detaches a contact from a property", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    const property = await createProperty(ctx.db, propertyInput, null);
    await attachContactToProperty(ctx.db, property.id, contact.id, "tenant", null);

    await detachContactFromProperty(ctx.db, property.id, contact.id, null);
    expect(await listPropertyContacts(ctx.db, property.id)).toHaveLength(0);
  });

  it("an organization can have multiple properties — ROADMAP.md Phase 3 acceptance", async () => {
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);
    await createProperty(ctx.db, { ...propertyInput, organizationId: org.id }, null);
    await createProperty(
      ctx.db,
      { ...propertyInput, addressLine1: "2 Main St", organizationId: org.id },
      null,
    );

    const orgProperties = await listOrganizationProperties(ctx.db, org.id);
    expect(orgProperties).toHaveLength(2);
  });
});
