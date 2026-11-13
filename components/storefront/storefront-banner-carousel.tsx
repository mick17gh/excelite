"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StoreBanner } from "@/lib/storefront/banners";
import { cn } from "@/lib/utils";

type Props = {
  banners: StoreBanner[];
  storeName: string;
  className?: string;
};

export function StorefrontBannerCarousel({ banners, storeName, className }: Props) {
  const [index, setIndex] = useState(0);
  const count = banners.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 5000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + count) % count);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-[#001F5C] shadow-[0_18px_50px_-18px_rgba(0,31,92,0.45),0_8px_20px_-10px_rgba(0,102,255,0.25)]",
        className,
      )}
    >
      <div className="relative aspect-[21/9] min-h-[180px] w-full sm:min-h-[240px] md:min-h-[280px]">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <Image
              src={banner.url}
              alt={`${storeName} banner ${i + 1}`}
              fill
              priority={i === 0}
              className="object-cover"
              unoptimized
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#001F5C]/55 via-[#001F5C]/10 to-transparent" />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#001F5C] shadow-md backdrop-blur hover:bg-white"
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#001F5C] shadow-md backdrop-blur hover:bg-white"
            aria-label="Next banner"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-[#0066FF]" : "w-1.5 bg-white/70 hover:bg-white",
                )}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
