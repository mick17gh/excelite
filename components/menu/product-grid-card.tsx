"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Image as ImageIcon, Trash2, Barcode } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductGridItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  availableAtAllBranches?: boolean;
  branchIds?: string[];
}

interface BranchOption {
  id: string;
  name: string;
}

interface ProductGridCardProps {
  item: ProductGridItem;
  branches: BranchOption[];
  formatCurrency: (amount: number) => string;
  onEdit: () => void;
  onDelete: () => void;
  onPrintBarcode?: () => void;
}

function visibilityLabel(item: ProductGridItem, branches: BranchOption[]) {
  if (item.availableAtAllBranches !== false) {
    return { label: "All branches", title: undefined };
  }
  const ids = item.branchIds ?? [];
  const names = branches.filter((b) => ids.includes(b.id)).map((b) => b.name);
  return {
    label: `${ids.length} branch${ids.length === 1 ? "" : "es"}`,
    title: names.length > 0 ? names.join(", ") : undefined,
  };
}

export function ProductGridCard({
  item,
  branches,
  formatCurrency,
  onEdit,
  onDelete,
  onPrintBarcode,
}: ProductGridCardProps) {
  const margin =
    item.price > 0 ? (((item.price - item.cost) / item.price) * 100).toFixed(1) : "0.0";
  const vis = visibilityLabel(item, branches);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-[#0066FF]/40 hover:-translate-y-0.5",
        !item.isActive && "opacity-75",
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-[#0066FF]/8 via-muted/40 to-muted">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/60 border border-white/80 shadow-sm">
              <ImageIcon className="h-7 w-7 text-[#0052CC]/40" />
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#001F5C]/70 via-[#001F5C]/25 to-transparent" />

        <span className="absolute bottom-3 left-3 text-lg font-bold tracking-tight text-white drop-shadow-sm">
          {formatCurrency(item.price)}
        </span>

        <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#0052CC] shadow-sm">
          {margin}% margin
        </span>

        {!item.isActive && (
          <Badge className="absolute top-3 left-3 bg-[#001F5C]/80 text-white border-0 text-[10px]">
            Inactive
          </Badge>
        )}

        <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {onPrintBarcode ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-lg bg-white/95 shadow-sm hover:bg-white"
              onClick={onPrintBarcode}
              aria-label={`Print barcode for ${item.name}`}
            >
              <Barcode className="h-3.5 w-3.5 text-[#001F5C]" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-lg bg-white/95 shadow-sm hover:bg-white"
            onClick={onEdit}
            aria-label={`Edit ${item.name}`}
          >
            <Edit className="h-3.5 w-3.5 text-[#001F5C]" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-lg bg-white/95 shadow-sm hover:bg-red-50 hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="min-w-0">
          <h3 className="font-semibold text-[#001F5C] leading-snug line-clamp-1">{item.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            <span className="font-mono">{item.sku}</span>
            <span className="mx-1.5 text-border">·</span>
            {item.category}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="rounded-full border-[#0066FF]/25 bg-[#0066FF]/8 text-[#0052CC] text-[10px] font-medium"
          >
            {item.category}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full text-[10px] font-normal border-border/80"
            title={vis.title}
          >
            {vis.label}
          </Badge>
        </div>

        {item.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2.5 text-xs">
          <span className="text-muted-foreground">
            Cost <span className="font-medium text-[#001F5C]">{formatCurrency(item.cost)}</span>
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="font-medium text-[#0052CC] hover:text-[#001F5C] transition-colors cursor-pointer"
          >
            Edit product
          </button>
        </div>
      </div>
    </article>
  );
}
