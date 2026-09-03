"use client";

import { type ChangeEvent, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { searchMediaAssetsAction, uploadMediaAssetAction } from "@/lib/website/media-actions";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface MediaAsset {
  id: string;
  key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Website editor overhaul, phase 1 — a real, reusable media library.
 * Replaces the raw `<input type="file">` scattered across every image
 * field in the CMS (each of which was its own one-shot upload with no way
 * to browse or reuse anything already uploaded elsewhere). Renders as a
 * plain trigger button — the caller shows its own "current image" preview
 * alongside it — so this drops into any existing form without changing
 * that form's layout. A modal is the deliberate exception to "avoid
 * excessive modals" here: browsing/searching a media grid is exactly the
 * case the guardrailed-editor brief calls out as modal-appropriate.
 */
export function MediaPicker({
  onSelect,
  triggerLabel = "Choose image",
}: {
  onSelect: (key: string) => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, startLoading] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    startLoading(async () => {
      const rows = await searchMediaAssetsAction(search || undefined);
      setAssets(rows);
    });
  }, [open, search]);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    uploadMediaAssetAction(formData).then((result) => {
      setUploading(false);
      event.target.value = "";
      if (result.ok) {
        onSelect(result.key);
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handlePick(asset: MediaAsset) {
    onSelect(asset.key);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search images by filename…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <div className="flex flex-col gap-1">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={handleUpload}
                className="w-auto"
              />
            </div>
          </div>
          {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
            {assets.map((asset) => (
              <button
                type="button"
                key={asset.id}
                onClick={() => handlePick(asset)}
                title={asset.filename}
                className="group relative aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-primary"
              >
                <Image
                  src={publicAssetUrl(asset.key)}
                  alt={asset.filename}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
            {!loading && assets.length === 0 ? (
              <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <ImageOff className="size-6" aria-hidden="true" />
                {search
                  ? `No images match "${search}".`
                  : "No images yet — upload one above to add it to the library."}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
