"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { archiveProperty, createProperty, unarchiveProperty, updateProperty } from "./properties";
import { propertyTypeEnum } from "@/lib/db/schema";

const propertySchema = z.object({
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  province: z.string().trim().min(1, "Province is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  propertyType: z.enum(propertyTypeEnum.enumValues).optional(),
});

export type PropertyFormState =
  { ok: true; propertyId: string } | { ok: false; error: string } | undefined;

/**
 * Deliberately does NOT require or accept a job — a property must be
 * creatable entirely on its own, per docs/CLAUDE.md §6 and the approved
 * Phase 3 plan. Organization linking is available from the edit form, not
 * this quick-create form, to keep creation fast.
 */
export async function createPropertyAction(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const session = await requireUser();
  const parsed = propertySchema.safeParse({
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    propertyType: formData.get("propertyType") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  const property = await createProperty(
    db,
    {
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2 || null,
      city: parsed.data.city,
      province: parsed.data.province,
      postalCode: parsed.data.postalCode,
      propertyType: parsed.data.propertyType,
    },
    session.user.id,
  );

  revalidatePath("/properties");
  return { ok: true, propertyId: property.id };
}

const updatePropertySchema = z.object({
  propertyId: z.string().uuid(),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  province: z.string().trim().min(1, "Province is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  propertyType: z.enum(propertyTypeEnum.enumValues),
  businessName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  organizationId: z.string().uuid().optional().or(z.literal("")),
});

export async function updatePropertyAction(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const session = await requireUser();
  const parsed = updatePropertySchema.safeParse({
    propertyId: formData.get("propertyId"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    propertyType: formData.get("propertyType"),
    businessName: formData.get("businessName") || undefined,
    notes: formData.get("notes") || undefined,
    organizationId: formData.get("organizationId") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateProperty(
    db,
    parsed.data.propertyId,
    {
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2 || null,
      city: parsed.data.city,
      province: parsed.data.province,
      postalCode: parsed.data.postalCode,
      propertyType: parsed.data.propertyType,
      businessName: parsed.data.businessName || null,
      notes: parsed.data.notes || null,
      organizationId: parsed.data.organizationId || null,
    },
    session.user.id,
  );

  revalidatePath("/properties");
  revalidatePath(`/properties/${parsed.data.propertyId}`);
  return { ok: true, propertyId: parsed.data.propertyId };
}

export async function archivePropertyAction(propertyId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await archiveProperty(db, propertyId, session.user.id);
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
}

export async function unarchivePropertyAction(propertyId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await unarchiveProperty(db, propertyId, session.user.id);
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
}
