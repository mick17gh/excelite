export const MAX_STORE_BANNERS = 5;

export type StoreBanner = {
  id: string;
  url: string;
  sortOrder: number;
};

function isStoreBanner(value: unknown): value is StoreBanner {
  if (!value || typeof value !== "object") return false;
  const banner = value as Record<string, unknown>;
  return (
    typeof banner.id === "string" &&
    banner.id.length > 0 &&
    typeof banner.url === "string" &&
    banner.url.length > 0 &&
    typeof banner.sortOrder === "number" &&
    Number.isFinite(banner.sortOrder)
  );
}

export function sortStoreBanners(banners: StoreBanner[]): StoreBanner[] {
  return [...banners].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function parseStoreBanners(raw: unknown): StoreBanner[] {
  if (!Array.isArray(raw)) return [];
  return sortStoreBanners(raw.filter(isStoreBanner).slice(0, MAX_STORE_BANNERS));
}

export function resolveStoreBanners(
  storeBanners: unknown,
  legacyBannerUrl: string | null | undefined
): StoreBanner[] {
  const parsed = parseStoreBanners(storeBanners);
  if (parsed.length > 0) return parsed;
  if (legacyBannerUrl) {
    return [{ id: "legacy", url: legacyBannerUrl, sortOrder: 0 }];
  }
  return [];
}

export function validateStoreBannersForSave(banners: StoreBanner[]): string | null {
  if (banners.length > MAX_STORE_BANNERS) {
    return `A maximum of ${MAX_STORE_BANNERS} banners is allowed`;
  }
  for (const banner of banners) {
    if (!isStoreBanner(banner)) return "Invalid banner data";
    try {
      new URL(banner.url);
    } catch {
      return "Each banner must have a valid URL";
    }
  }
  return null;
}

export function normalizeBannersForSave(banners: StoreBanner[]): StoreBanner[] {
  return sortStoreBanners(banners).map((banner, index) => ({
    id: banner.id,
    url: banner.url,
    sortOrder: index,
  }));
}

export function getPrimaryBannerUrl(banners: StoreBanner[]): string | null {
  return sortStoreBanners(banners)[0]?.url ?? null;
}
