"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MAX_STORE_BANNERS, sortStoreBanners, type StoreBanner } from "@/lib/storefront/banners";
import { updateOrganization } from "@/lib/actions/organization";

type Props = {
  organizationId: string;
  banners: StoreBanner[];
  onChange: (banners: StoreBanner[]) => void;
  disabled?: boolean;
};

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function StoreBannerManager({
  organizationId,
  banners,
  onChange,
  disabled,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  const sortedBanners = sortStoreBanners(banners);
  const atMax = sortedBanners.length >= MAX_STORE_BANNERS;
  const busy = disabled || isUploading || isPersisting;

  const persistBanners = async (next: StoreBanner[], successMessage: string) => {
    onChange(next);
    setIsPersisting(true);
    try {
      const result = await updateOrganization({
        id: organizationId,
        storeBanners: next,
      });
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      toast.success(successMessage);
      return true;
    } catch {
      toast.error("Failed to save banners");
      return false;
    } finally {
      setIsPersisting(false);
    }
  };

  const handleAddClick = () => {
    if (busy || atMax) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }
    if (sortedBanners.length >= MAX_STORE_BANNERS) {
      toast.error(`You can upload up to ${MAX_STORE_BANNERS} banners.`);
      return;
    }

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("folder", "store");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData.url) {
        toast.error(uploadData.error || "Failed to upload banner");
        return;
      }

      const nextBanner: StoreBanner = {
        id: crypto.randomUUID(),
        url: String(uploadData.url),
        sortOrder: sortedBanners.length,
      };
      await persistBanners([...sortedBanners, nextBanner], "Banner uploaded and published to storefront");
    } catch {
      toast.error("Failed to upload banner");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async (id: string) => {
    const next = sortStoreBanners(sortedBanners.filter((banner) => banner.id !== id)).map(
      (banner, index) => ({
        ...banner,
        sortOrder: index,
      }),
    );
    await persistBanners(next, "Banner removed");
  };

  const moveBanner = async (id: string, direction: "up" | "down") => {
    const index = sortedBanners.findIndex((banner) => banner.id === id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedBanners.length) return;

    const next = [...sortedBanners];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    await persistBanners(
      next.map((banner, order) => ({ ...banner, sortOrder: order })),
      "Banner order updated",
    );
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Store banners</p>
          <p className="text-xs text-muted-foreground">
            Upload up to {MAX_STORE_BANNERS} images for the storefront hero slider. Changes publish
            immediately.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={handleAddClick}
          disabled={busy || atMax}
        >
          {isUploading || isPersisting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
          )}
          Add banner
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {sortedBanners.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No banners yet. Add images to show a slider on your storefront.
        </p>
      ) : (
        <ul className="space-y-2">
          {sortedBanners.map((banner, index) => (
            <li key={banner.id} className="flex items-center gap-3 rounded-md border p-2">
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image src={banner.url} alt="" fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0 flex-1">
                <Label className="text-xs text-muted-foreground">Banner {index + 1}</Label>
                <p className="truncate text-xs">{banner.url}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => void moveBanner(banner.id, "up")}
                  disabled={busy || index === 0}
                  aria-label="Move banner up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => void moveBanner(banner.id, "down")}
                  disabled={busy || index === sortedBanners.length - 1}
                  aria-label="Move banner down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => void handleRemove(banner.id)}
                  disabled={busy}
                  aria-label="Remove banner"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {atMax && (
        <p className="text-xs text-muted-foreground">
          Maximum of {MAX_STORE_BANNERS} banners reached.
        </p>
      )}
    </div>
  );
}
