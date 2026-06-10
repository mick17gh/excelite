import type { Branch, Staff, User } from "@/lib/generated/prisma/client";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/prisma/decimal";

type BranchWithRelations = Branch & { staff?: Staff[]; users?: User[] };

export type BranchScalarsForClient = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  currency: string;
  phone: string | null;
  /** Alias for branch details UI (`phone` in Prisma). */
  phoneNumber: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  isActive: boolean;
  onlineStoreVisible: boolean;
  openingDate: string | null;
  requiredStaff: number;
  seatCount: number | null;
  taxRate: number;
  taxName: string;
  taxEnabled: boolean;
  taxInclusive: boolean;
  showTaxOnReceipt: boolean;
  blockSalesWhenOutOfStock: boolean | null;
  tableServiceEnabled: boolean;
  paystackSubaccountCode: string | null;
  paystackSubaccountId: number | null;
  settlementBankCode: string | null;
  settlementAccountNumber: string | null;
  settlementAccountName: string | null;
  paystackPercentageCharge: number | null;
  paystackSubaccountActive: boolean | null;
  paystackSubaccountSyncedAt: string | null;
  paystackSubaccountSource: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type SerializedStaff = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobRoleId: string;
  hourlyRate: number;
  hireDate: string;
  branchId: string;
  isActive: boolean;
  dutyStatus: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type SerializedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  organizationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SerializedBranchForClient = BranchScalarsForClient & {
  staff: SerializedStaff[];
  users: SerializedUser[];
};

export type BranchListItemForClient = {
  id: string;
  name: string;
  code: string;
  city: string;
  isActive: boolean;
  currency: string;
};

/** Minimal branch row for branches list / currency hooks — no Decimal fields. */
export function pickBranchListItem(branch: BranchScalarsForClient): BranchListItemForClient {
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    city: branch.city,
    isActive: branch.isActive,
    currency: branch.currency,
  };
}

function serializeStaffForClient(member: Staff): SerializedStaff {
  return {
    id: member.id,
    employeeId: member.employeeId,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    jobRoleId: member.jobRoleId,
    hourlyRate: decimalToNumber(member.hourlyRate),
    hireDate: member.hireDate.toISOString(),
    branchId: member.branchId,
    isActive: member.isActive,
    dutyStatus: member.dutyStatus,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    deletedAt: member.deletedAt ? member.deletedAt.toISOString() : null,
  };
}

function serializeUserForClient(user: User): SerializedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    organizationId: user.organizationId,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** Scalar branch fields only — safe to pass from Server Components to Client Components. */
export function serializeBranchScalarsForClient(branch: Branch): BranchScalarsForClient {
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    city: branch.city,
    state: branch.state,
    country: branch.country,
    currency: branch.currency,
    phone: branch.phone,
    phoneNumber: branch.phone,
    email: branch.email,
    latitude: decimalToNullableNumber(branch.latitude),
    longitude: decimalToNullableNumber(branch.longitude),
    timezone: branch.timezone,
    isActive: branch.isActive,
    onlineStoreVisible: branch.onlineStoreVisible,
    openingDate: branch.openingDate ? branch.openingDate.toISOString() : null,
    requiredStaff: branch.requiredStaff,
    seatCount: branch.seatCount,
    taxRate: decimalToNumber(branch.taxRate),
    taxName: branch.taxName,
    taxEnabled: branch.taxEnabled,
    taxInclusive: branch.taxInclusive,
    showTaxOnReceipt: branch.showTaxOnReceipt,
    blockSalesWhenOutOfStock: branch.blockSalesWhenOutOfStock,
    tableServiceEnabled: branch.tableServiceEnabled,
    paystackSubaccountCode: branch.paystackSubaccountCode,
    paystackSubaccountId: branch.paystackSubaccountId,
    settlementBankCode: branch.settlementBankCode,
    settlementAccountNumber: branch.settlementAccountNumber,
    settlementAccountName: branch.settlementAccountName,
    paystackPercentageCharge: decimalToNullableNumber(branch.paystackPercentageCharge),
    paystackSubaccountActive: branch.paystackSubaccountActive,
    paystackSubaccountSyncedAt: branch.paystackSubaccountSyncedAt
      ? branch.paystackSubaccountSyncedAt.toISOString()
      : null,
    paystackSubaccountSource: branch.paystackSubaccountSource,
    organizationId: branch.organizationId,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
    deletedAt: branch.deletedAt ? branch.deletedAt.toISOString() : null,
  };
}

/** Branch with optional relations — for server actions that return full branch records. */
export function serializeBranchForClient(branch: BranchWithRelations): SerializedBranchForClient {
  return {
    ...serializeBranchScalarsForClient(branch),
    staff: (branch.staff ?? []).map(serializeStaffForClient),
    users: (branch.users ?? []).map(serializeUserForClient),
  };
}
