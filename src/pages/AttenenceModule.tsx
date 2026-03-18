import React, { useMemo, useState } from "react";
import {
  addMonths,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addDays,
  endOfWeek,
  endOfMonth,
} from "date-fns";
import { CheckCircle2, XCircle, Users, CalendarDays } from "lucide-react";

// -----------------------------
// Types
// -----------------------------
type User = { id: string; name: string };

type InPunch = {
  userId: string;
  date: string; // yyyy-MM-dd
  inTime: string; // HH:mm
};

type Holiday = {
  date: string; // yyyy-MM-dd
  name: string;
};

type Status = "PRESENT" | "LATE" | "ABSENT" | "HOLIDAY" | "WEEK_OFF" | "UPCOMING";

type ComputedStatus = {
  status: Status;
  label: string;
};

type DayUserDetail = {
  userId: string;
  userName: string;
  status: Status;
  inTime?: string;
  note?: string;
};

type DayAgg = {
  present: number; // includes LATE
  absent: number;
  late: number;
  holiday?: Holiday | null;
  weekOff: boolean;
  upcoming: boolean;
  details: DayUserDetail[];
};

// -----------------------------
// Mock Users + Data (replace with API later)
// -----------------------------
const MOCK_USERS: User[] = [
  { id: "u1", name: "Amit" },
  { id: "u2", name: "Neha" },
  { id: "u3", name: "Rahul" },
];

const MOCK_IN_PUNCHES: InPunch[] = [
  // Amit
  { userId: "u1", date: "2026-02-02", inTime: "09:05" },
  { userId: "u1", date: "2026-02-03", inTime: "09:22" },
  { userId: "u1", date: "2026-02-05", inTime: "08:58" },
  { userId: "u1", date: "2026-02-06", inTime: "10:10" },

  // Neha
  { userId: "u2", date: "2026-02-02", inTime: "09:02" },
  { userId: "u2", date: "2026-02-04", inTime: "09:40" },

  // Rahul
  { userId: "u3", date: "2026-02-03", inTime: "08:50" },
  { userId: "u3", date: "2026-02-06", inTime: "09:10" },
];

const MOCK_HOLIDAYS: Holiday[] = [{ date: "2026-02-14", name: "Sample Holiday" }];

const ALL_USERS = "ALL" as const;

// -----------------------------
// Helpers
// -----------------------------
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isWeekOff(date: Date, weekOffDays: number[]): boolean {
  return weekOffDays.includes(date.getDay()); // Sun=0 ... Sat=6
}

function getHolidayForDate(holidaysByDate: Map<string, Holiday>, yyyyMmDd: string) {
  return holidaysByDate.get(yyyyMmDd) ?? null;
}

function computeStatus(args: {
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

function isMissedLoginToday(args: {
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

function getDayLine(status: Status) {
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

// -----------------------------
// Small UI Components
// -----------------------------
function StatusPill({ status }: { status: Status }) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border";
  const map: Record<Status, string> = {
    PRESENT: "border-green-200 bg-green-50 text-green-700",
    LATE: "border-amber-200 bg-amber-50 text-amber-800",
    ABSENT: "border-red-200 bg-red-50 text-red-700",
    HOLIDAY: "border-blue-200 bg-blue-50 text-blue-700",
    WEEK_OFF: "border-slate-200 bg-slate-50 text-slate-700",
    UPCOMING: "border-zinc-200 bg-zinc-50 text-zinc-600",
  };
  return <span className={`${base} ${map[status]}`}>{status}</span>;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "from-zinc-900 to-zinc-700",
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm">
      <div
        className={[
          "absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-10",
          accent,
        ].join(" ")}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {title}
          </div>
          <div className="mt-1 text-3xl font-bold text-zinc-900">{value}</div>
          {subtitle ? <div className="mt-1 text-sm text-zinc-600">{subtitle}</div> : null}
        </div>
        <div className="rounded-xl border bg-zinc-50 p-2 text-zinc-800">{icon}</div>
      </div>
    </div>
  );
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total <= 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>Attendance</span>
        <span className="font-semibold text-zinc-800">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
        <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-md border px-2 py-1 text-sm hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border px-3 py-2"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 600,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border px-3 py-2"
      />
    </label>
  );
}

function WeekOffPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const days: { k: number; name: string }[] = [
    { k: 0, name: "Sun" },
    { k: 1, name: "Mon" },
    { k: 2, name: "Tue" },
    { k: 3, name: "Wed" },
    { k: 4, name: "Thu" },
    { k: 5, name: "Fri" },
    { k: 6, name: "Sat" },
  ];

  return (
    <div className="text-sm">
      <div className="mb-2 text-zinc-700">Week Off Days</div>
      <div className="flex flex-wrap gap-2">
        {days.map((d) => {
          const selected = value.includes(d.k);
          return (
            <button
              key={d.k}
              type="button"
              onClick={() => {
                if (selected) onChange(value.filter((x) => x !== d.k));
                else onChange([...value, d.k].sort((a, b) => a - b));
              }}
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold",
                selected ? "bg-zinc-900 text-white border-zinc-900" : "hover:bg-zinc-50",
              ].join(" ")}
            >
              {d.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------
// Header
// -----------------------------
function HeaderBar(props: {
  selectedUserId: string;
  onChangeUser: (id: string) => void;
  users: User[];
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  lateAfter: string;
  currentMonth: Date;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  todayLabel: string;
}) {
  const selectedUserName =
    props.selectedUserId === ALL_USERS
      ? "All Users"
      : props.users.find((u) => u.id === props.selectedUserId)?.name ?? "User";

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border bg-gradient-to-br from-zinc-900 to-zinc-700 p-5 text-white shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            <div className="text-2xl font-semibold">Attendance Calendar</div>
          </div>
          <div className="mt-1 text-sm text-white/80">
            User: <span className="font-semibold text-white">{selectedUserName}</span> • Shift:{" "}
            <span className="font-semibold text-white">{props.shiftName}</span> •{" "}
            {props.shiftStart}–{props.shiftEnd} • Grace {props.graceMinutes} min • Late after{" "}
            <span className="font-semibold text-white">{props.lateAfter}</span>
          </div>
          <div className="mt-1 text-xs text-white/70">
            Month: <span className="font-semibold text-white">{format(props.currentMonth, "MMMM yyyy")}</span>{" "}
            • Demo “now”: {props.todayLabel}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2">
            <Users className="h-4 w-4 text-white/90" />
            <select
              value={props.selectedUserId}
              onChange={(e) => props.onChangeUser(e.target.value)}
              className="bg-transparent text-sm font-semibold text-white outline-none"
            >
              <option value={ALL_USERS} className="text-zinc-900">
                All Users
              </option>
              {props.users.map((u) => (
                <option key={u.id} value={u.id} className="text-zinc-900">
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
              onClick={props.onPrev}
            >
              Prev
            </button>
            <button
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
              onClick={props.onToday}
            >
              Today
            </button>
            <button
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
              onClick={props.onNext}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Calendar Grid
// -----------------------------
function CalendarGrid(props: {
  days: Date[];
  currentMonth: Date;
  today: Date;
  lateAfter: string;
  shiftStart: string;
  graceMinutes: number;
  weekOffDays: number[];
  holidaysByDate: Map<string, Holiday>;
  // mode
  selectedUserId: string;
  // single-user punches
  punchesByDate: Map<string, InPunch>;
  // all-users aggregates
  dayAggByDate: Map<string, DayAgg>;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
}) {
  const isAll = props.selectedUserId === ALL_USERS;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold">{format(props.currentMonth, "MMMM yyyy")}</div>
        <div className="text-xs text-zinc-500">
          {isAll ? "Mode: All Users" : "Mode: Single User"}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-zinc-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
          <div key={x} className="px-1 py-2 text-center font-semibold">
            {x}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {props.days.map((dateObj) => {
          const key = format(dateObj, "yyyy-MM-dd");
          const inMonth = isSameMonth(dateObj, props.currentMonth);
          const isSelected = props.selectedDate && isSameDay(dateObj, props.selectedDate);

          if (isAll) {
            const agg = props.dayAggByDate.get(key);
            const holiday = agg?.holiday ?? null;

            const pillStatus: Status =
              holiday ? "HOLIDAY" : agg?.weekOff ? "WEEK_OFF" : agg?.upcoming ? "UPCOMING" : agg && agg.absent > 0 ? "ABSENT" : "PRESENT";

            return (
              <button
                key={key}
                onClick={() => props.onSelectDate(dateObj)}
                className={[
                  "group min-h-[100px] rounded-xl border p-2 text-left transition",
                  "hover:-translate-y-[1px] hover:shadow-sm hover:bg-zinc-50",
                  inMonth ? "bg-white" : "bg-zinc-50 text-zinc-400",
                  isSelected ? "ring-2 ring-zinc-900" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <div className="text-sm font-bold">{format(dateObj, "d")}</div>
                  <StatusPill status={pillStatus} />
                </div>

                <div className="mt-2 space-y-1">
                  {holiday ? (
                    <div className="text-xs font-semibold text-blue-700 line-clamp-2">
                      {holiday.name}
                    </div>
                  ) : null}

                  {!holiday && agg && !agg.weekOff && !agg.upcoming ? (
                    <>
                      <div className="text-[11px] font-semibold text-zinc-700 group-hover:text-zinc-900">
                        P: {agg.present} • A: {agg.absent}
                      </div>
                      {agg.late > 0 ? (
                        <div className="text-[11px] text-amber-800">Late: {agg.late}</div>
                      ) : (
                        <div className="text-[11px] text-zinc-500"> </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-zinc-500">
                      {agg?.weekOff ? "Week Off" : agg?.upcoming ? "" : holiday ? "" : ""}
                    </div>
                  )}
                </div>
              </button>
            );
          }

          // Single user mode
          const punch = props.punchesByDate.get(key) ?? null;
          const holiday = getHolidayForDate(props.holidaysByDate, key);

          const computed = computeStatus({
            date: dateObj,
            today: props.today,
            shiftStart: props.shiftStart,
            graceMinutes: props.graceMinutes,
            weekOffDays: props.weekOffDays,
            punch,
            holiday,
          });

          const missed = isMissedLoginToday({
            date: dateObj,
            today: props.today,
            shiftStart: props.shiftStart,
            graceMinutes: props.graceMinutes,
            punch,
          });

          const dayLine = getDayLine(computed.status);

          return (
            <button
              key={key}
              onClick={() => props.onSelectDate(dateObj)}
              className={[
                "group min-h-[100px] rounded-xl border p-2 text-left transition",
                "hover:-translate-y-[1px] hover:shadow-sm hover:bg-zinc-50",
                inMonth ? "bg-white" : "bg-zinc-50 text-zinc-400",
                isSelected ? "ring-2 ring-zinc-900" : "",
                missed ? "border-red-300" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <div className="text-sm font-bold">{format(dateObj, "d")}</div>
                <StatusPill status={computed.status} />
              </div>

              <div className="mt-2 space-y-1">
                {dayLine ? (
                  <div className="text-[11px] font-semibold text-zinc-700 group-hover:text-zinc-900">
                    {dayLine}
                  </div>
                ) : null}

                {holiday ? (
                  <div className="text-xs font-semibold text-blue-700 line-clamp-2">
                    {holiday.name}
                  </div>
                ) : null}

                {punch ? (
                  <div className="text-xs text-zinc-700">
                    <span className="font-semibold">IN</span> {punch.inTime}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">
                    {computed.status === "UPCOMING" ? "" : "No IN"}
                  </div>
                )}

                {computed.status === "LATE" ? (
                  <div className="text-[11px] text-amber-800">{computed.label}</div>
                ) : null}

                {missed ? (
                  <div className="text-[11px] font-semibold text-red-700">
                    Missed login (after {props.lateAfter})
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------
// Shift Settings Panel
// -----------------------------
function ShiftSettingsPanel(props: {
  shiftName: string;
  setShiftName: (v: string) => void;
  shiftStart: string;
  setShiftStart: (v: string) => void;
  shiftEnd: string;
  setShiftEnd: (v: string) => void;
  graceMinutes: number;
  setGraceMinutes: (v: number) => void;
  weekOffDays: number[];
  setWeekOffDays: (v: number[]) => void;
  lateAfter: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 text-lg font-semibold">Shift & Timing Settings (UI)</div>

      <div className="grid grid-cols-1 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Shift Name</span>
          <input
            value={props.shiftName}
            onChange={(e) => props.setShiftName(e.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="General"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Start Time" value={props.shiftStart} onChange={props.setShiftStart} />
          <TimeField label="End Time" value={props.shiftEnd} onChange={props.setShiftEnd} />
        </div>

        <NumberField
          label="Grace Minutes"
          value={props.graceMinutes}
          onChange={props.setGraceMinutes}
          min={0}
          max={120}
        />

        <WeekOffPicker value={props.weekOffDays} onChange={props.setWeekOffDays} />

        <div className="rounded-xl border bg-zinc-50 p-3 text-sm">
          <div className="font-semibold">Computed Rules Preview</div>
          <div className="mt-1 text-zinc-700">
            Late after: <span className="font-bold">{props.lateAfter}</span>
          </div>
          <div className="text-zinc-700">
            If no IN on working day (past date) → <span className="font-bold">ABSENT</span>
          </div>
          <div className="text-zinc-700">Holiday/Week-off → not absent</div>
        </div>

        <div className="text-xs text-zinc-500">
          Later you can save these settings to DB. For now, this UI updates rules instantly.
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Drawer Content
// -----------------------------
function DayDetailsDrawerContent(props: {
  selectedDate: Date;
  selectedUserId: string;
  users: User[];
  // single user
  punch: InPunch | null;
  computed: ComputedStatus | null;
  holiday: Holiday | null;
  // all users
  agg: DayAgg | null;
  // shift display
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  lateAfter: string;
}) {
  const isAll = props.selectedUserId === ALL_USERS;

  if (isAll) {
    const agg = props.agg;
    return (
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border p-3">
          <div className="font-semibold">Summary</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-zinc-700">Present (incl Late)</div>
            <div className="font-bold">{agg?.present ?? 0}</div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-zinc-700">Absent</div>
            <div className="font-bold">{agg?.absent ?? 0}</div>
          </div>
          {agg?.late ? (
            <div className="mt-1 flex items-center justify-between">
              <div className="text-zinc-700">Late</div>
              <div className="font-bold text-amber-800">{agg.late}</div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border p-3">
          <div className="font-semibold">Shift</div>
          <div className="mt-1 text-zinc-700">
            {props.shiftName}: {props.shiftStart}–{props.shiftEnd}
          </div>
          <div className="text-zinc-700">
            Grace: {props.graceMinutes} min • Late after: {props.lateAfter}
          </div>
        </div>

        {agg?.holiday ? (
          <div className="rounded-xl border p-3">
            <div className="font-semibold text-blue-700">Holiday</div>
            <div className="mt-1">{agg.holiday.name}</div>
          </div>
        ) : null}

        {agg?.weekOff ? (
          <div className="rounded-xl border p-3">
            <div className="font-semibold">Week Off</div>
            <div className="mt-1 text-zinc-700">Selected day is week off.</div>
          </div>
        ) : null}

        {agg?.upcoming ? (
          <div className="rounded-xl border p-3">
            <div className="font-semibold">Upcoming</div>
            <div className="mt-1 text-zinc-700">No status yet.</div>
          </div>
        ) : null}

        {agg && !agg.weekOff && !agg.upcoming && !agg.holiday ? (
          <div className="rounded-xl border p-3">
            <div className="mb-2 font-semibold">Users on this day</div>
            <div className="space-y-2">
              {agg.details.map((u) => (
                <div key={u.userId} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{u.userName}</div>
                    <div className="text-xs text-zinc-600">
                      {u.inTime ? `IN ${u.inTime}` : "No IN"}
                      {u.note ? ` • ${u.note}` : ""}
                    </div>
                  </div>
                  <StatusPill status={u.status} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Single user
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Status</div>
        <StatusPill status={props.computed?.status || "UPCOMING"} />
      </div>

      <div className="rounded-xl border p-3">
        <div className="font-semibold">Shift</div>
        <div className="mt-1 text-zinc-700">
          {props.shiftName}: {props.shiftStart}–{props.shiftEnd}
        </div>
        <div className="text-zinc-700">
          Grace: {props.graceMinutes} min • Late after: {props.lateAfter}
        </div>
      </div>

      {props.holiday && (
        <div className="rounded-xl border p-3">
          <div className="font-semibold text-blue-700">Holiday</div>
          <div className="mt-1">{props.holiday.name}</div>
        </div>
      )}

      <div className="rounded-xl border p-3">
        <div className="font-semibold">Punches (only IN)</div>
        {props.punch ? (
          <div className="mt-2 flex items-center justify-between">
            <div>IN</div>
            <div className="font-bold">{props.punch.inTime}</div>
          </div>
        ) : (
          <div className="mt-2 text-zinc-600">No IN punch</div>
        )}
      </div>

      {props.computed?.label ? (
        <div className="rounded-xl border bg-zinc-50 p-3">
          <div className="font-semibold">Note</div>
          <div className="mt-1 text-zinc-700">{props.computed.label}</div>
        </div>
      ) : null}

      <div className="text-xs text-zinc-500">
        Add actions later: Regularize / Mark leave / Admin override.
      </div>
    </div>
  );
}

// -----------------------------
// Main Page
// -----------------------------
export default function AttendanceCalendarPage() {
  // Demo “now”: fixed
  const today = useMemo(() => new Date(2026, 1, 8, 10, 30), []);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));

  // User selection
  const [selectedUserId, setSelectedUserId] = useState<string>(ALL_USERS);

  // Shift config
  const [shiftName, setShiftName] = useState<string>("General");
  const [shiftStart, setShiftStart] = useState<string>("09:00");
  const [shiftEnd, setShiftEnd] = useState<string>("19:00");
  const [graceMinutes, setGraceMinutes] = useState<number>(15);
  const [weekOffDays, setWeekOffDays] = useState<number[]>([0]); // Sunday

  // Drawer state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const holidaysByDate = useMemo(() => {
    const m = new Map<string, Holiday>();
    for (const h of MOCK_HOLIDAYS) m.set(h.date, h);
    return m;
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const lateAfterMinutes = toMinutes(shiftStart) + graceMinutes;
  const lateAfter = minutesToHHMM(lateAfterMinutes);

  const days: Date[] = useMemo(() => {
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  // Single-user punches map
  const punchesByDate = useMemo(() => {
    const m = new Map<string, InPunch>();
    if (selectedUserId === ALL_USERS) return m;

    for (const p of MOCK_IN_PUNCHES) {
      if (p.userId === selectedUserId) m.set(p.date, p);
    }
    return m;
  }, [selectedUserId]);

  // Pre-index punches for ALL mode
  const punchIndexByDate = useMemo(() => {
    const byDate = new Map<string, Map<string, InPunch>>();
    for (const p of MOCK_IN_PUNCHES) {
      if (!byDate.has(p.date)) byDate.set(p.date, new Map());
      byDate.get(p.date)!.set(p.userId, p);
    }
    return byDate;
  }, []);

  // ALL users aggregates for each day on grid (for calendar + drawer)
  const dayAggByDate = useMemo(() => {
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
        for (const u of MOCK_USERS) {
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
            inTime: punch?.inTime,
            note: computed.label,
          });
        }
      }

      m.set(key, agg);
    }

    return m;
  }, [
    days,
    holidaysByDate,
    weekOffDays,
    today,
    shiftStart,
    graceMinutes,
    punchIndexByDate,
  ]);

  // Month stats (cards) — works for ALL and single
  const monthStats = useMemo(() => {
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

      if (selectedUserId === ALL_USERS) {
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

    return { present, absent, workingDays };
  }, [
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
  ]);

  // Drawer selections
  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedHoliday = selectedKey ? getHolidayForDate(holidaysByDate, selectedKey) : null;

  const selectedPunch =
    selectedKey && selectedUserId !== ALL_USERS ? punchesByDate.get(selectedKey) ?? null : null;

  const selectedComputed =
    selectedDate && selectedUserId !== ALL_USERS
      ? computeStatus({
          date: selectedDate,
          today,
          shiftStart,
          graceMinutes,
          weekOffDays,
          punch: selectedPunch,
          holiday: selectedHoliday,
        })
      : null;

  const selectedAgg = selectedKey ? dayAggByDate.get(selectedKey) ?? null : null;

  const drawerTitle = selectedDate
    ? `Day Details • ${format(selectedDate, "yyyy-MM-dd")} • ${
        selectedUserId === ALL_USERS
          ? "All Users"
          : MOCK_USERS.find((u) => u.id === selectedUserId)?.name ?? "User"
      }`
    : "Day Details";

  const todayLabel = format(today, "yyyy-MM-dd HH:mm");

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto px-4 py-6">
        <HeaderBar
          selectedUserId={selectedUserId}
          onChangeUser={setSelectedUserId}
          users={MOCK_USERS}
          shiftName={shiftName}
          shiftStart={shiftStart}
          shiftEnd={shiftEnd}
          graceMinutes={graceMinutes}
          lateAfter={lateAfter}
          currentMonth={currentMonth}
          onPrev={() => setCurrentMonth(addMonths(currentMonth, -1))}
          onToday={() => setCurrentMonth(startOfMonth(today))}
          onNext={() => setCurrentMonth(addMonths(currentMonth, 1))}
          todayLabel={todayLabel}
        />

        {/* TOP STATS */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <StatCard
              title="No. of Present (incl. Late)"
              value={monthStats.present}
              subtitle={`For ${format(currentMonth, "MMMM yyyy")}`}
              icon={<CheckCircle2 className="h-5 w-5" />}
              accent="from-green-600 to-emerald-500"
            />
            <ProgressBar value={monthStats.present} total={Math.max(1, monthStats.workingDays)} />
          </div>

          <div>
            <StatCard
              title="No. of Absent"
              value={monthStats.absent}
              subtitle={
                selectedUserId === ALL_USERS
                  ? `Working days: ${monthStats.workingDays} • Users: ${MOCK_USERS.length}`
                  : `Working days counted: ${monthStats.workingDays}`
              }
              icon={<XCircle className="h-5 w-5" />}
              accent="from-red-600 to-rose-500"
            />
            <ProgressBar value={monthStats.absent} total={Math.max(1, monthStats.workingDays)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <CalendarGrid
            days={days}
            currentMonth={currentMonth}
            today={today}
            lateAfter={lateAfter}
            shiftStart={shiftStart}
            graceMinutes={graceMinutes}
            weekOffDays={weekOffDays}
            holidaysByDate={holidaysByDate}
            selectedUserId={selectedUserId}
            punchesByDate={punchesByDate}
            dayAggByDate={dayAggByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <ShiftSettingsPanel
            shiftName={shiftName}
            setShiftName={setShiftName}
            shiftStart={shiftStart}
            setShiftStart={setShiftStart}
            shiftEnd={shiftEnd}
            setShiftEnd={setShiftEnd}
            graceMinutes={graceMinutes}
            setGraceMinutes={setGraceMinutes}
            weekOffDays={weekOffDays}
            setWeekOffDays={setWeekOffDays}
            lateAfter={lateAfter}
          />
        </div>

        <Drawer open={!!selectedDate} onClose={() => setSelectedDate(null)} title={drawerTitle}>
          {selectedDate ? (
            <DayDetailsDrawerContent
              selectedDate={selectedDate}
              selectedUserId={selectedUserId}
              users={MOCK_USERS}
              punch={selectedPunch}
              computed={selectedComputed}
              holiday={selectedHoliday}
              agg={selectedAgg}
              shiftName={shiftName}
              shiftStart={shiftStart}
              shiftEnd={shiftEnd}
              graceMinutes={graceMinutes}
              lateAfter={lateAfter}
            />
          ) : null}
        </Drawer>
      </div>
    </div>
  );
}
