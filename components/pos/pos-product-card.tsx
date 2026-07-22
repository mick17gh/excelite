"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { posProductCardClass } from "@/components/pos/pos-theme";

interface PosProductCardProps {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string | null;
  quantityInCart: number;
  outOfStock: boolean;
  formatCurrency: (amount: number) => string;
  onClick: () => void;
}

export function PosProductCard({
  name,
  category,
  price,
  imageUrl,
  quantityInCart,
  outOfStock,
  formatCurrency,
  onClick,
}: PosProductCardProps) {
  const active = quantityInCart > 0;

  return (
    <button
      type="button"
      disabled={outOfStock}
      className={posProductCardClass({ active, disabled: outOfStock })}
      onClick={onClick}
    >
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#22C55E]/8 via-muted/30 to-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/70 shadow-sm">
              <UtensilsCrossed className="h-6 w-6 text-[#16A34A]/45" />
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#222831]/75 via-[#222831]/30 to-transparent" />

        <span className="absolute bottom-2 left-2.5 text-sm font-bold tracking-tight text-white drop-shadow-sm">
          {formatCurrency(price)}
        </span>

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#222831]/50 backdrop-blur-[1px]">
            <Badge className="border-0 bg-[#222831]/90 text-white text-[10px] font-semibold">
              Out of stock
            </Badge>
          </div>
        )}

        {active && !outOfStock && (
          <Badge className="absolute top-2 right-2 flex h-7 min-w-7 items-center justify-center rounded-full border-0 bg-[#22C55E] px-1.5 text-xs font-bold text-white shadow-md">
            {quantityInCart}
          </Badge>
        )}
      </div>

      <div className="mt-2.5 min-w-0 text-left">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#222831]">{name}</h3>
        <Badge
          variant="outline"
          className="mt-1.5 max-w-full truncate border-[#22C55E]/20 bg-[#22C55E]/6 text-[10px] font-medium text-[#16A34A]"
        >
          {category}
        </Badge>
      </div>
    </button>
  );
}
