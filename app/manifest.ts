import type { MetadataRoute } from "next";
import { SERVGO_BRAND } from "@/lib/brand-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SERVGO_BRAND.name,
    short_name: SERVGO_BRAND.shortName,
    description: SERVGO_BRAND.tagline,
    start_url: "/pos",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: SERVGO_BRAND.themeColor,
    orientation: "portrait-primary",
    icons: [
      {
        src: "/servgo.jpeg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "maskable",
      },
      {
        src: "/servgo.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
