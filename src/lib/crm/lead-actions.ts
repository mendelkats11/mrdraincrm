"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import {
  changeLeadStatus,
  convertLeadToJob,
  createLead,
  type LeadStatus,
  updateLead,
} from "./leads";

const uuidOrEmpty = z.union([z.literal(""), z.string().uuid()]);

const leadSchema = z.object({
  contactId: uuidOrEmpty.optional(),
  propertyId: uuidOrEmpty.optional(),
  organizationId: uuidOrEmpty.optional(),
  serviceId: uuidOrEmpty.optional(),
  issueDescription: z.string().trim().optional(),
  emergency: z.union([z.literal("on"), z.literal("")]).optional(),
  source: z.string().trim().optional(),
  sourceDetails: z.string().trim().optional(),
});

export type LeadFormState = { ok: true; leadId: string } | { ok: false; error: string } | undefined;

export async function createLeadAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const session = await requireUser();
  const parsed = leadSchema.safeParse({
    contactId: formData.get("contactId") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    serviceId: formData.get("serviceId") || undefined,
    issueDescription: formData.get("issueDescription") || undefined,
    emergency: formData.get("emergency") || undefined,
    source: formData.get("source") || undefined,
    sourceDetails: formData.get("sourceDetails") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const lead = await createLead(
    db,
    {
      contactId: parsed.data.contactId || null,
      propertyId: parsed.data.propertyId || null,
      organizationId: parsed.data.organizationId || null,
      serviceId: parsed.data.serviceId || null,
      issueDescription: parsed.data.issueDescription || null,
      emergency: parsed.data.emergency === "on",
      source: parsed.data.source || null,
      sourceDetails: parsed.data.sourceDetails || null,
    },
    session.user.id,
  );

  revalidatePath("/leads");
  return { ok: true, leadId: lead.id };
}

const updateLeadSchema = z.object({
  leadId: z.string().uuid(),
  contactId: uuidOrEmpty.optional(),
  propertyId: uuidOrEmpty.optional(),
  organizationId: uuidOrEmpty.optional(),
  serviceId: uuidOrEmpty.optional(),
  issueDescription: z.string().trim().optional(),
  emergency: z.union([z.literal("on"), z.literal("")]).optional(),
  latestSource: z.string().trim().optional(),
  sourceDetails: z.string().trim().optional(),
});

export async function updateLeadAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const session = await requireUser();
  const parsed = updateLeadSchema.safeParse({
    leadId: formData.get("leadId"),
    contactId: formData.get("contactId") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    organizationId: formData.get("organizationId") || undefined,
    serviceId: formData.get("serviceId") || undefined,
    issueDescription: formData.get("issueDescription") || undefined,
    emergency: formData.get("emergency") || undefined,
    latestSource: formData.get("latestSource") || undefined,
    sourceDetails: formData.get("sourceDetails") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateLead(
    db,
    parsed.data.leadId,
    {
      contactId: parsed.data.contactId || null,
      propertyId: parsed.data.propertyId || null,
      organizationId: parsed.data.organizationId || null,
      serviceId: parsed.data.serviceId || null,
      issueDescription: parsed.data.issueDescription || null,
      emergency: parsed.data.emergency === "on",
      latestSource: parsed.data.latestSource || null,
      sourceDetails: parsed.data.sourceDetails || null,
    },
    session.user.id,
  );

  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.leadId}`);
  return { ok: true, leadId: parsed.data.leadId };
}

// "won" is deliberately excluded — see changeLeadStatus's own comment in
// src/lib/crm/leads.ts. It's set only by convertLeadToJobAction.
const statusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "contacted", "quoted", "follow_up", "lost"]),
});

export type SimpleFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function changeLeadStatusAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const session = await requireUser();
  const parsed = statusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const result = await changeLeadStatus(
    db,
    parsed.data.leadId,
    parsed.data.status as Exclude<LeadStatus, "won">,
    session.user.id,
  );
  if (!result.ok) {
    const messages: Record<typeof result.error, string> = {
      not_found: "Lead could not be found.",
      cannot_set_won_directly: "A lead becomes Won only by converting it to a job.",
      lead_already_won: "This lead has already been converted and cannot change status.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.leadId}`);
  return { ok: true };
}

export type ConvertLeadFormState =
  { ok: true; jobNumber: string } | { ok: false; error: string } | undefined;

export async function convertLeadToJobAction(leadId: string): Promise<ConvertLeadFormState> {
  const session = await requireUser();
  const db = getDb();
  const result = await convertLeadToJob(db, leadId, session.user.id);
  if (!result.ok) {
    const messages: Record<typeof result.error, string> = {
      not_found: "Lead could not be found.",
      already_converted: "This lead has already been converted to a job.",
      lead_lost: "A Lost lead cannot be converted. Change its status first.",
    };
    return { ok: false, error: messages[result.error] };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true, jobNumber: result.jobNumber };
}
