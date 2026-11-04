"use client";

import Image from "next/image";
import { Image as ImageIcon, Plus } from "lucide-react";
import type { PublicMenuItem } from "@/lib/storefront/menu";
import { cn } from "@/lib/utils";

type Props = {
  item: PublicMenuItem;
  currency: string;
  disabled?: boolean;
  onAdd: () => void;
};

export function StorefrontProductCard({ item, currency, disabled, onAdd }: Props) {
  const priceLabel = `${currency} ${item.price.toFixed(2)}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-[#22C55E]/40 hover:-translate-y-0.5",
        disabled && "opacity-70",
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-[#22C55E]/8 via-muted/40 to-muted">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/60 shadow-sm">
              <ImageIcon className="h-7 w-7 text-[#16A34A]/40" />
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#222831]/70 via-[#222831]/25 to-transparent" />

        <span className="absolute bottom-3 left-3 text-lg font-bold tracking-tight text-white drop-shadow-sm">
          {priceLabel}
        </span>

        {item.category ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#16A34A] shadow-sm">
            {item.category.name}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="min-w-0">
          <h3 className="line-clamp-1 font-semibold leading-snug text-[#222831]">{item.name}</h3>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          className={cn(
            "mt-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white transition-colors",
            "bg-[#22C55E] hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:bg-slate-300",
          )}
        >
          <Plus className="h-4 w-4" />
          Add to cart
        </button>
      </div>
    </article>
  );
}
