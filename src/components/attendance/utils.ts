import {
  format,
  isAfter,
  isSameDay,
  startOfMonth,
  startOfWeek,
  addDays,
  endOfWeek,
  endOfMonth,
} from "date-fns";
import type { 
  User, 
  InPunch, 
  Holiday, 
  Status, 
  ComputedStatus, 
  DayAgg
} from "./types";

export function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isWeekOff(date: Date, weekOffDays: number[]): boolean {
  return weekOffDays.includes(date.getDay()); // Sun=0 ... Sat=6
}

export function getHolidayForDate(holidaysByDate: Map<string, Holiday>, yyyyMmDd: string) {
  return holidaysByDate.get(yyyyMmDd) ?? null;
}

export function computeStatus(args: {
  date: Date;
  today: Date;
  shiftStart: string;
  graceMinutes: number;
  weekOffDays: number[];
  punch: InPunch | null;
  holiday: Holiday | null;
}): ComputedStatus {
  const { date, today, shiftStart, graceMinutes, weekOffDays, punch, holiday } =
    args;

  if (holiday) return { status: "HOLIDAY", label: holiday.name };
  if (isWeekOff(date, weekOffDays)) return { status: "WEEK_OFF", label: "Week Off" };
  if (isAfter(date, today)) return { status: "UPCOMING", label: "" };

  if (!punch) return { status: "ABSENT", label: "No IN" };

  const lateAfter = toMinutes(shiftStart) + Number(graceMinutes || 0);
  const inMin = toMinutes(punch.inTime);

  if (inMin > lateAfter) {
    return { status: "LATE", label: `Late by ${inMin - lateAfter} min` };
  }
  return { status: "PRESENT", label: "On time" };
}

export function isMissedLoginToday(args: {
  date: Date;
  today: Date;
  shiftStart: string;
  graceMinutes: number;
  punch: InPunch | null;
}): boolean {
  const { date, today, shiftStart, graceMinutes, punch } = args;
  if (!isSameDay(date, today)) return false;

  // demo: treat `today` as now
  const now = today;
  const deadlineMinutes = toMinutes(shiftStart) + Number(graceMinutes || 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > deadlineMinutes && !punch;
}

export function getDayLine(status: Status) {
  switch (status) {
    case "PRESENT":
      return "This day: Present";
    case "LATE":
      return "This day: Late";
    case "ABSENT":
      return "This day: Absent";
    case "HOLIDAY":
      return "This day: Holiday";
    case "WEEK_OFF":
      return "This day: Week Off";
    default:
      return "";
  }
}

export function isWorkingDayStatus(s: Status) {
  return s !== "HOLIDAY" && s !== "WEEK_OFF" && s !== "UPCOMING";
}

export function generateCalendarDays(currentMonth: Date): Date[] {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export function calculateDayAggregates(args: {
  days: Date[];
  users: User[];
  holidaysByDate: Map<string, Holiday>;
  weekOffDays: number[];
  today: Date;
  shiftStart: string;
  graceMinutes: number;
  punchIndexByDate: Map<string, Map<string, InPunch>>;
}): Map<string, DayAgg> {
  const { days, users, holidaysByDate, weekOffDays, today, shiftStart, graceMinutes, punchIndexByDate } = args;
  const m = new Map<string, DayAgg>();

  for (const dateObj of days) {
    const key = format(dateObj, "yyyy-MM-dd");
    const holiday = getHolidayForDate(holidaysByDate, key);
    const weekOff = isWeekOff(dateObj, weekOffDays);
    const upcoming = isAfter(dateObj, today);

    const agg: DayAgg = {
      present: 0,
      absent: 0,
      late: 0,
      holiday,
      weekOff,
      upcoming,
      details: [],
    };

    // count statuses only for working, non-upcoming days
    if (!holiday && !weekOff && !upcoming) {
      for (const u of users) {
        const punch = punchIndexByDate.get(key)?.get(u.id) ?? null;

        const computed = computeStatus({
          date: dateObj,
          today,
          shiftStart,
          graceMinutes,
          weekOffDays,
          punch,
          holiday,
        });

        if (computed.status === "PRESENT") agg.present += 1;
        if (computed.status === "LATE") {
          agg.present += 1;
          agg.late += 1;
        }
        if (computed.status === "ABSENT") agg.absent += 1;

        agg.details.push({
          userId: u.id,
          userName: u.name,
          status: computed.status,
          inTime: punch?.inTime ?? undefined,
          note: computed.label,
        });
      }
    }

    m.set(key, agg);
  }

  return m;
}

export function calculateMonthStats(args: {
  monthStart: Date;
  monthEnd: Date;
  holidaysByDate: Map<string, Holiday>;
  weekOffDays: number[];
  today: Date;
  selectedUserId: string;
  dayAggByDate: Map<string, DayAgg>;
  punchesByDate: Map<string, InPunch>;
  shiftStart: string;
  graceMinutes: number;
  users?: { id: string; name: string }[];
}) {
  const {
    monthStart,
    monthEnd,
    holidaysByDate,
    weekOffDays,
    today,
    selectedUserId,
    dayAggByDate,
    punchesByDate,
    shiftStart,
    graceMinutes,
    users
  } = args;

  let present = 0;
  let absent = 0;
  let workingDays = 0;

  let cur = monthStart;
  while (cur <= monthEnd) {
    const key = format(cur, "yyyy-MM-dd");
    const holiday = getHolidayForDate(holidaysByDate, key);
    const weekOff = isWeekOff(cur, weekOffDays);
    const upcoming = isAfter(cur, today);

    const isWorking = !holiday && !weekOff && !upcoming;
    if (isWorking) workingDays += 1;

    if (selectedUserId === "ALL") {
      const agg = dayAggByDate.get(key);
      if (agg && isWorking) {
        present += agg.present;
        absent += agg.absent;
      }
    } else {
      const punch = punchesByDate.get(key) ?? null;
      const computed = computeStatus({
        date: cur,
        today,
        shiftStart,
        graceMinutes,
        weekOffDays,
        punch,
        holiday,
      });

      if (computed.status === "PRESENT" || computed.status === "LATE") present += 1;
      if (computed.status === "ABSENT") absent += 1;
    }

    cur = addDays(cur, 1);
  }

  // For All Users mode, adjust working days to account for total possible attendances
  const totalWorkingDays = selectedUserId === "ALL" && users 
    ? workingDays * users.length 
    : workingDays;

  return { present, absent, workingDays: totalWorkingDays };
}
