import type { ClientMenuOptionGroup } from "@/lib/menu-option-client";

export interface PosBranch {
  id: string;
  name: string;
  code: string;
  currency?: string | null;
}

export interface PosMenuItem {
  id: string;
  name: string;
  sku?: string;
  category: string;
  price: number;
  imageUrl?: string | null;
  optionGroups?: ClientMenuOptionGroup[];
  availableAtAllBranches?: boolean;
  branchIds?: string[];
}

export interface PosCartLine {
  lineKey: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  menuItemOptionIds: string[];
  configurationLabel: string;
}

export interface PosCustomer {
  id: string;
  name: string;
  phone: string;
}

export interface PosRecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  openedAt: Date | string;
  branch: { name: string };
}
