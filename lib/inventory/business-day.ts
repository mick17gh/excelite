function getTzParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: get("hour"),
    min: get("minute"),
    s: get("second"),
  };
}

function localToUtc(
  dateKey: string,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string
): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  let utcMs = Date.UTC(y, m - 1, d, hour, minute, second, ms);

  for (let attempt = 0; attempt < 60; attempt++) {
    const parts = getTzParts(new Date(utcMs), timeZone);
    if (
      parts.y === y &&
      parts.m === m &&
      parts.d === d &&
      parts.h === hour &&
      parts.min === minute &&
      parts.s === second
    ) {
      return new Date(utcMs);
    }
    const currentMinutes = parts.h * 60 + parts.min;
    const targetMinutes = hour * 60 + minute;
    let dayDelta = 0;
    if (parts.y !== y || parts.m !== m || parts.d !== d) {
      dayDelta = parts.d > d || parts.m > m ? 1 : -1;
    }
    utcMs -= (dayDelta * 24 * 60 + (currentMinutes - targetMinutes)) * 60 * 1000;
  }

  return new Date(Date.UTC(y, m - 1, d, hour, minute, second, ms));
}

/** Inclusive UTC range for a calendar date in the branch timezone. */
export function getBusinessDayBounds(
  timeZone: string,
  dateKey?: string
): { start: Date; end: Date; dateKey: string } {
  const key =
    dateKey ??
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  const start = localToUtc(key, 0, 0, 0, 0, timeZone);
  const end = localToUtc(key, 23, 59, 59, 999, timeZone);
  return { start, end, dateKey: key };
}

export function parseDateKeyToUtcDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}
