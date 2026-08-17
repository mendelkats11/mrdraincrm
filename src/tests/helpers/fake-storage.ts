import type { StorageProvider, UploadInput } from "@/lib/storage";

/**
 * In-memory StorageProvider for tests — mirrors the ConsoleEmailProvider
 * dev-stand-in pattern (src/lib/email/console-provider.ts). Job photo
 * service functions take a StorageProvider as an explicit parameter
 * specifically so tests can pass this instead of a real R2 client.
 */
export class FakeStorageProvider implements StorageProvider {
  objects = new Map<string, { body: Buffer; contentType: string }>();
  deletedKeys: string[] = [];

  async upload(input: UploadInput): Promise<void> {
    this.objects.set(input.key, { body: input.body, contentType: input.contentType });
  }

  async download(key: string): Promise<Buffer> {
    const object = this.objects.get(key);
    if (!object) throw new Error(`Object not found: ${key}`);
    return object.body;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
    this.deletedKeys.push(key);
  }

  async getSignedUrl(key: string): Promise<string> {
    return `https://fake-storage.test/${key}?signed=1`;
  }
}
