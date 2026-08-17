import type { JobPhotoWithUrl } from "@/lib/jobs/job-photos";
import { PhotoCard } from "./photo-card";
import { PhotoUploadForm } from "./photo-upload-form";

export function PhotosSection({ jobId, photos }: { jobId: string; photos: JobPhotoWithUrl[] }) {
  return (
    <div className="flex flex-col gap-4">
      <PhotoUploadForm jobId={jobId} />
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} jobId={jobId} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
}
