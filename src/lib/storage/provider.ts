// Provider-agnostic file storage interface — docs/ARCHITECTURE.md §11,
// docs/IMPLEMENTATION_PLAN.md §9.3. Cloudflare R2 is the concrete
// implementation (this phase); nothing outside src/lib/storage/ should ever
// import an R2/S3 SDK type directly, so swapping providers later is a
// contained change.

export interface UploadInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** Private objects only — there is no stable public URL for anything
   *  uploaded through this interface. Default expiry is short-lived. */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
