export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const weekdayOptions: { label: string; value: Weekday }[] = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
];

export const weekdayLabelMap: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export const weekdaysToBitmask = (days: Weekday[]) =>
  days.reduce((mask, day) => mask | (1 << (day - 1)), 0);

export const bitmaskToWeekdays = (mask: number): Weekday[] =>
  weekdayOptions
    .map((day) => day.value)
    .filter((day) => (mask & (1 << (day - 1))) !== 0);

export const timeStringToSeconds = (time: string) => {
  const [hh, mm] = time.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 3600 + mm * 60;
};

export const secondsToTimeString = (seconds: number) => {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hh = String(Math.floor(total / 3600) % 24).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const formatTimeForDisplay = (value: unknown) => {
  if (typeof value === "number") return secondsToTimeString(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return secondsToTimeString(Number(trimmed));
    return trimmed || "-";
  }
  return "-";
};

export const toTimeInputValue = (value: unknown) => {
  if (typeof value === "number") return secondsToTimeString(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return secondsToTimeString(Number(trimmed));
    return trimmed;
  }
  return "";
};

export const normalizeUnixSeconds = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return String(numeric >= 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric));
};

export const normalizeUnixMillis = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return String(numeric >= 1_000_000_000_000 ? Math.floor(numeric) : Math.floor(numeric * 1000));
};

