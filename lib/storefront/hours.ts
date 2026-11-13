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

export type NextStoreOpen = {
  /** Absolute UTC instant when the store next opens */
  atMs: number;
  /** HH:mm in store timezone */
  openTime: string;
  /** HH:mm close for that day, when known */
  closeTime: string | null;
  dayKey: keyof BusinessHours;
  dayOffset: number;
  isToday: boolean;
  label: string;
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

const DAY_LABEL: Record<keyof BusinessHours, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

function parseTimeToMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function formatDisplayTime(hhmm: string): string {
  const minutes = parseTimeToMinutes(hhmm);
  if (minutes === null) return hhmm;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function localTimeParts(
  timeZone: string,
  date: Date = new Date(),
): {
  dayIndex: number;
  hour: number;
  minute: number;
  second: number;
  year: number;
  month: number;
  day: number;
  isoDate: string;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const month = Number(parts.find((p) => p.type === "month")?.value || "01");
  const day = Number(parts.find((p) => p.type === "day")?.value || "01");
  const year = Number(parts.find((p) => p.type === "year")?.value || "1970");
  let hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  // Some engines emit "24" for midnight
  if (hour === 24) hour = 0;
  const minute = Number(parts.find((p) => p.type === "minute")?.value || "0");
  const second = Number(parts.find((p) => p.type === "second")?.value || "0");
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return {
    dayIndex: dayIndex < 0 ? 0 : dayIndex,
    hour,
    minute,
    second,
    year,
    month,
    day,
    isoDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** Convert a wall-clock datetime in `timeZone` to a UTC epoch ms. */
function zonedWallTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const asLocal = localTimeParts(timeZone, new Date(utcGuess));
  const desiredAsMinutes = ((hour * 60 + minute) | 0) + day * 1440 + month * 44640 + year * 535680;
  const actualAsMinutes =
    ((asLocal.hour * 60 + asLocal.minute) | 0) +
    asLocal.day * 1440 +
    asLocal.month * 44640 +
    asLocal.year * 535680;
  const diffMinutes = desiredAsMinutes - actualAsMinutes;
  return utcGuess + diffMinutes * 60_000;
}

function addCalendarDays(year: number, month: number, day: number, offset: number) {
  const base = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

export function getNextStoreOpen(
  hours: BusinessHours | null | undefined,
  timeZone: string | null | undefined,
  now: Date = new Date(),
): NextStoreOpen | null {
  if (!hours || Object.keys(hours).length === 0) return null;

  const tz = timeZone || "Africa/Accra";
  const nowParts = localTimeParts(tz, now);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;

  for (let offset = 0; offset < 7; offset += 1) {
    const idx = (nowParts.dayIndex + offset) % 7;
    const dayKey = dayNames[idx];
    const config = hours[dayKey];
    const open = parseTimeToMinutes(config?.open);
    const close = parseTimeToMinutes(config?.close);
    if (!config || config.closed || open === null || close === null) continue;
    if (offset === 0 && nowMinutes >= open) continue;

    const calendar = addCalendarDays(nowParts.year, nowParts.month, nowParts.day, offset);
    const openHour = Math.floor(open / 60);
    const openMinute = open % 60;
    const atMs = zonedWallTimeToUtcMs(
      calendar.year,
      calendar.month,
      calendar.day,
      openHour,
      openMinute,
      tz,
    );
    if (atMs <= now.getTime() - 1000) continue;

    const openDisplay = formatDisplayTime(config.open);
    const isToday = offset === 0;
    const label = isToday
      ? `Opens today at ${openDisplay}`
      : offset === 1
        ? `Opens tomorrow at ${openDisplay}`
        : `Opens ${DAY_LABEL[dayKey]} at ${openDisplay}`;

    return {
      atMs,
      openTime: config.open,
      closeTime: config.close || null,
      dayKey,
      dayOffset: offset,
      isToday,
      label,
    };
  }

  return null;
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

  const next = getNextStoreOpen(hours, tz);
  return {
    isOpenNow: false,
    reason: "outside_business_hours",
    nextOpenAt: next?.label ?? null,
  };
}
