type BusinessHourSlot = {
  open: string;
  close: string;
  closed?: boolean;
};

export type BusinessHours = Partial<
  Record<
    "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
    BusinessHourSlot
  >
>;

export type StoreAvailability = {
  isOpenNow: boolean;
  reason: "open" | "outside_business_hours";
  nextOpenAt: string | null;
};

const dayNames: Array<keyof BusinessHours> = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function parseTimeToMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function localTimeParts(timeZone: string): { dayIndex: number; hour: number; minute: number; isoDate: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const day = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const dayOfMonth = parts.find((p) => p.type === "day")?.value || "01";
  const year = parts.find((p) => p.type === "year")?.value || "1970";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value || "0");
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
  return { dayIndex: dayIndex < 0 ? 0 : dayIndex, hour, minute, isoDate: `${year}-${month}-${dayOfMonth}` };
}

export function getStoreAvailabilityByHours(
  hours: BusinessHours | null | undefined,
  timeZone: string | null | undefined
): StoreAvailability {
  if (!hours || Object.keys(hours).length === 0) {
    return { isOpenNow: true, reason: "open", nextOpenAt: null };
  }

  const tz = timeZone || "Africa/Accra";
  const nowParts = localTimeParts(tz);
  const todayName = dayNames[nowParts.dayIndex];
  const todayConfig = hours[todayName];
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;

  const openMinutes = parseTimeToMinutes(todayConfig?.open);
  const closeMinutes = parseTimeToMinutes(todayConfig?.close);
  const isClosedDay = !todayConfig || todayConfig.closed || openMinutes === null || closeMinutes === null;

  if (!isClosedDay && nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
    return { isOpenNow: true, reason: "open", nextOpenAt: null };
  }

  for (let offset = 0; offset < 7; offset += 1) {
    const idx = (nowParts.dayIndex + offset) % 7;
    const dayName = dayNames[idx];
    const config = hours[dayName];
    const open = parseTimeToMinutes(config?.open);
    const close = parseTimeToMinutes(config?.close);
    if (!config || config.closed || open === null || close === null) continue;
    if (offset === 0 && nowMinutes < open) {
      return {
        isOpenNow: false,
        reason: "outside_business_hours",
        nextOpenAt: `${dayName} ${config.open}`,
      };
    }
    if (offset > 0) {
      return {
        isOpenNow: false,
        reason: "outside_business_hours",
        nextOpenAt: `${dayName} ${config.open}`,
      };
    }
  }

  return { isOpenNow: false, reason: "outside_business_hours", nextOpenAt: null };
}
