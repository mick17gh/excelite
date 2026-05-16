"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MAX_STORE_BANNERS, sortStoreBanners, type StoreBanner } from "@/lib/storefront/banners";

type Props = {
  banners: StoreBanner[];
  onChange: (banners: StoreBanner[]) => void;
  disabled?: boolean;
};

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function StoreBannerManager({ banners, onChange, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const sortedBanners = sortStoreBanners(banners);
  const atMax = sortedBanners.length >= MAX_STORE_BANNERS;

  const handleAddClick = () => {
    if (disabled || atMax || isUploading) return;
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
        url: uploadData.url as string,
        sortOrder: sortedBanners.length,
      };
      onChange([...sortedBanners, nextBanner]);
      toast.success("Banner added");
    } catch {
      toast.error("Failed to upload banner");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (id: string) => {
    const next = sortStoreBanners(sortedBanners.filter((banner) => banner.id !== id)).map((banner, index) => ({
      ...banner,
      sortOrder: index,
    }));
    onChange(next);
  };

  const moveBanner = (id: string, direction: "up" | "down") => {
    const index = sortedBanners.findIndex((banner) => banner.id === id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedBanners.length) return;

    const next = [...sortedBanners];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next.map((banner, order) => ({ ...banner, sortOrder: order })));
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Store banners</p>
          <p className="text-xs text-muted-foreground">
            Upload up to {MAX_STORE_BANNERS} images for the storefront hero slider.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={handleAddClick}
          disabled={disabled || atMax || isUploading}
        >
          {isUploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
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
        <p className="text-xs text-muted-foreground">No banners yet. Add images to show a slider on your storefront.</p>
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
                  onClick={() => moveBanner(banner.id, "up")}
                  disabled={disabled || index === 0}
                  aria-label="Move banner up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveBanner(banner.id, "down")}
                  disabled={disabled || index === sortedBanners.length - 1}
                  aria-label="Move banner down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(banner.id)}
                  disabled={disabled}
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
        <p className="text-xs text-muted-foreground">Maximum of {MAX_STORE_BANNERS} banners reached.</p>
      )}
    </div>
  );
}
