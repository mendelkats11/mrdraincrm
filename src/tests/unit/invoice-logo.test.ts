import { describe, expect, it } from "vitest";
import { uploadInvoiceLogo, resolveLogoUrl } from "@/lib/pdf/logo";
import { FakeStorageProvider } from "../helpers/fake-storage";

describe("uploadInvoiceLogo", () => {
  it("rejects a disallowed content type", async () => {
    const storage = new FakeStorageProvider();
    const result = await uploadInvoiceLogo(storage, {
      buffer: Buffer.from("not-an-image"),
      contentType: "application/pdf",
    });
    expect(result.ok).toBe(false);
    expect(storage.objects.size).toBe(0);
  });

  it("rejects a file over 2MB", async () => {
    const storage = new FakeStorageProvider();
    const result = await uploadInvoiceLogo(storage, {
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
      contentType: "image/png",
    });
    expect(result.ok).toBe(false);
    expect(storage.objects.size).toBe(0);
  });

  it("uploads a valid PNG under the settings/logo/ prefix", async () => {
    const storage = new FakeStorageProvider();
    const result = await uploadInvoiceLogo(storage, {
      buffer: Buffer.from("fake-png-bytes"),
      contentType: "image/png",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.key).toMatch(/^settings\/logo\/.+\.png$/);
    expect(storage.objects.has(result.key)).toBe(true);
  });

  it("rejects SVG — a signed URL is directly navigable, so an embedded <script> would run in this app's origin", async () => {
    const storage = new FakeStorageProvider();
    const result = await uploadInvoiceLogo(storage, {
      buffer: Buffer.from("<svg></svg>"),
      contentType: "image/svg+xml",
    });
    expect(result.ok).toBe(false);
  });
});

describe("resolveLogoUrl", () => {
  it("returns null for a null key without calling storage", async () => {
    const storage = new FakeStorageProvider();
    expect(await resolveLogoUrl(storage, null)).toBeNull();
  });

  it("returns a signed URL for a stored key", async () => {
    const storage = new FakeStorageProvider();
    const url = await resolveLogoUrl(storage, "settings/logo/abc.png");
    expect(url).toBe("https://fake-storage.test/settings/logo/abc.png?signed=1");
  });

  it("degrades to null if the storage provider throws", async () => {
    const storage = new FakeStorageProvider();
    storage.getSignedUrl = async () => {
      throw new Error("boom");
    };
    expect(await resolveLogoUrl(storage, "settings/logo/abc.png")).toBeNull();
  });
});
