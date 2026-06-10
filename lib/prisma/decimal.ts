/** Prisma Decimal → plain number for RSC props and server-action responses. */
export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && value !== null) {
    const maybe = value as { toNumber?: () => number };
    if (typeof maybe.toNumber === "function") return maybe.toNumber();
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function decimalToNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  return decimalToNumber(value);
}
