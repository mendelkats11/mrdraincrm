"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import {
  archiveOrganization,
  createOrganization,
  unarchiveOrganization,
  updateOrganization,
} from "./organizations";

const emailField = z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]);

const organizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  email: emailField.optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type OrganizationFormState =
  { ok: true; organizationId: string } | { ok: false; error: string } | undefined;

export async function createOrganizationAction(
  _prevState: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const session = await requireUser();
  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const organization = await createOrganization(
    db,
    {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
    session.user.id,
  );

  revalidatePath("/organizations");
  return { ok: true, organizationId: organization.id };
}

const updateOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  email: emailField.optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function updateOrganizationAction(
  _prevState: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const session = await requireUser();
  const parsed = updateOrganizationSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateOrganization(
    db,
    parsed.data.organizationId,
    {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
    session.user.id,
  );

  revalidatePath("/organizations");
  revalidatePath(`/organizations/${parsed.data.organizationId}`);
  return { ok: true, organizationId: parsed.data.organizationId };
}

export async function archiveOrganizationAction(organizationId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await archiveOrganization(db, organizationId, session.user.id);
  revalidatePath("/organizations");
  revalidatePath(`/organizations/${organizationId}`);
}

export async function unarchiveOrganizationAction(organizationId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await unarchiveOrganization(db, organizationId, session.user.id);
  revalidatePath("/organizations");
  revalidatePath(`/organizations/${organizationId}`);
}
