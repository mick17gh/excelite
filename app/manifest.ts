import type { MetadataRoute } from "next";
import { EXCELITE_BRAND } from "@/lib/excelite-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: EXCELITE_BRAND.name,
    short_name: EXCELITE_BRAND.shortName,
    description: EXCELITE_BRAND.tagline,
    start_url: "/pos",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: EXCELITE_BRAND.themeColor,
    orientation: "portrait-primary",
    icons: [
      {
        src: "/excelite_logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/excelite_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
