const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  ...DATE_FORMAT,
  hour: "numeric",
  minute: "2-digit",
};

/** Fixed en-US formatting so SSR and client hydration match. */
export function formatDisplayDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", DATE_FORMAT);
}

export function formatDisplayDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", DATE_TIME_FORMAT);
}
