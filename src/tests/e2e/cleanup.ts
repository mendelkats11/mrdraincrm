import { eq, ilike, inArray, or } from "drizzle-orm";
import { E2E_NAME_PREFIX, E2E_OWNER_EMAIL } from "./e2e-credentials";

/**
 * Removes every trace of the E2E test run: the dedicated test owner, its
 * sessions, and every contact/organization/property it created (matched by
 * the E2E_NAME_PREFIX convention), respecting FK dependency order so
 * nothing hits the ON DELETE RESTRICT constraints those tables carry.
 *
 * Unlike the Phase 2 manual-verification cleanup (which preserved the
 * append-only activity log and only detached the actor), this deletes
 * activity rows outright. That earlier cleanup was removing traces of real
 * manual testing worth keeping a record of; this one runs on every
 * automated E2E execution — keeping "E2E test user did X" activity rows
 * forever would be pure noise, not audit history worth preserving.
 * Idempotent: safe to call whether or not the E2E fixtures currently exist.
 */
export async function cleanupE2eData() {
  const { getDb } = await import("../../lib/db/client");
  const {
    activities,
    contactEmails,
    contactPhones,
    contacts,
    jobCustomCharges,
    jobs,
    leads,
    organizationContacts,
    organizations,
    properties,
    propertyContacts,
    sessions,
    users,
  } = await import("../../lib/db/schema");

  const db = getDb();

  const testContacts = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(ilike(contacts.displayName, `${E2E_NAME_PREFIX}%`));
  const testContactIds = testContacts.map((c) => c.id);

  const testOrganizations = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(ilike(organizations.name, `${E2E_NAME_PREFIX}%`));
  const testOrganizationIds = testOrganizations.map((o) => o.id);

  const testProperties = await db
    .select({ id: properties.id })
    .from(properties)
    .where(ilike(properties.addressLine1, `${E2E_NAME_PREFIX}%`));
  const testPropertyIds = testProperties.map((p) => p.id);

  // Leads/jobs reference contacts/properties/organizations with ON DELETE
  // RESTRICT, so they must be found and removed *before* those rows below —
  // matched by relation to the test contact/property/organization rows
  // above, the same way this function already matches everything else by
  // relation rather than a naming convention on leads/jobs themselves.
  let testLeadIds: string[] = [];
  if (testContactIds.length > 0 || testPropertyIds.length > 0 || testOrganizationIds.length > 0) {
    const relationConditions = [];
    if (testContactIds.length > 0)
      relationConditions.push(inArray(leads.contactId, testContactIds));
    if (testPropertyIds.length > 0)
      relationConditions.push(inArray(leads.propertyId, testPropertyIds));
    if (testOrganizationIds.length > 0)
      relationConditions.push(inArray(leads.organizationId, testOrganizationIds));
    const testLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(or(...relationConditions));
    testLeadIds = testLeads.map((l) => l.id);
  }

  // Jobs may have no relationships at all (docs/CLAUDE.md §6), so they're
  // also matched directly by an E2E_NAME_PREFIX-tagged issue description —
  // relation-matching alone would silently leave those behind.
  const relationConditions = [ilike(jobs.issueDescription, `${E2E_NAME_PREFIX}%`)];
  if (testLeadIds.length > 0) relationConditions.push(inArray(jobs.leadId, testLeadIds));
  if (testContactIds.length > 0) relationConditions.push(inArray(jobs.contactId, testContactIds));
  if (testPropertyIds.length > 0)
    relationConditions.push(inArray(jobs.propertyId, testPropertyIds));
  if (testOrganizationIds.length > 0)
    relationConditions.push(inArray(jobs.organizationId, testOrganizationIds));
  const testJobs = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(or(...relationConditions));
  const testJobIds = testJobs.map((j) => j.id);

  // jobs.lead_id -> leads.id and leads.converted_job_id -> jobs.id form a
  // circular RESTRICT reference (the bidirectional link recorded at
  // conversion time). Null out the leads side first so either table can
  // then be deleted without the other blocking it.
  if (testLeadIds.length > 0) {
    await db.update(leads).set({ convertedJobId: null }).where(inArray(leads.id, testLeadIds));
  }
  if (testJobIds.length > 0) {
    // job_custom_charges is ON DELETE RESTRICT (unlike job_photos, which
    // cascades), so it must be cleared before the job row itself.
    await db.delete(jobCustomCharges).where(inArray(jobCustomCharges.jobId, testJobIds));
    await db.delete(activities).where(inArray(activities.entityId, testJobIds));
    await db.delete(jobs).where(inArray(jobs.id, testJobIds));
  }
  if (testLeadIds.length > 0) {
    await db.delete(activities).where(inArray(activities.entityId, testLeadIds));
    await db.delete(leads).where(inArray(leads.id, testLeadIds));
  }

  if (testContactIds.length > 0) {
    await db.delete(contactPhones).where(inArray(contactPhones.contactId, testContactIds));
    await db.delete(contactEmails).where(inArray(contactEmails.contactId, testContactIds));
    await db
      .delete(organizationContacts)
      .where(inArray(organizationContacts.contactId, testContactIds));
    await db.delete(propertyContacts).where(inArray(propertyContacts.contactId, testContactIds));
    await db.delete(activities).where(inArray(activities.entityId, testContactIds));
  }
  if (testOrganizationIds.length > 0) {
    await db
      .delete(organizationContacts)
      .where(inArray(organizationContacts.organizationId, testOrganizationIds));
    await db.delete(activities).where(inArray(activities.entityId, testOrganizationIds));
  }
  if (testPropertyIds.length > 0) {
    await db.delete(propertyContacts).where(inArray(propertyContacts.propertyId, testPropertyIds));
    await db.delete(activities).where(inArray(activities.entityId, testPropertyIds));
  }

  // Properties before organizations — properties.organization_id references
  // organizations with ON DELETE RESTRICT.
  if (testPropertyIds.length > 0) {
    await db.delete(properties).where(inArray(properties.id, testPropertyIds));
  }
  if (testOrganizationIds.length > 0) {
    await db.delete(organizations).where(inArray(organizations.id, testOrganizationIds));
  }
  if (testContactIds.length > 0) {
    await db.delete(contacts).where(inArray(contacts.id, testContactIds));
  }

  const [testUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, E2E_OWNER_EMAIL));
  if (testUser) {
    await db.delete(sessions).where(eq(sessions.userId, testUser.id));
    await db.delete(activities).where(eq(activities.actorUserId, testUser.id));
    await db.delete(users).where(eq(users.id, testUser.id));
  }
}
