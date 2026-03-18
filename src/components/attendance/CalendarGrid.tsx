import { format, isSameMonth, isSameDay } from "date-fns";
import { StatusPill } from "./UIComponents";
import { 
  computeStatus, 
  isMissedLoginToday, 
  getDayLine, 
  getHolidayForDate 
} from "./utils";
import type { 
  Status, 
  InPunch, 
  Holiday, 
  DayAgg, 
  AllUsersType 
} from "./types";

interface CalendarGridProps {
  days: Date[];
  currentMonth: Date;
  today: Date;
  lateAfter: string;
  shiftStart: string;
  graceMinutes: number;
  weekOffDays: number[];
  holidaysByDate: Map<string, Holiday>;
  selectedUserId: string | AllUsersType;
  punchesByDate: Map<string, InPunch>;
  calendarStatusByDate: Map<string, { status: Status; label: string }>;
  dayAggByDate: Map<string, DayAgg>;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
}

export function CalendarGrid({
  days,
  currentMonth,
  today,
  lateAfter,
  shiftStart,
  graceMinutes,
  weekOffDays,
  holidaysByDate,
  selectedUserId,
  punchesByDate,
  calendarStatusByDate,
  dayAggByDate,
  selectedDate,
  onSelectDate,
}: CalendarGridProps) {
  const isAll = selectedUserId === "ALL";

  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm shadow-lg overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-white drop-shadow-sm">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <div className="text-sm text-white/90 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
            {isAll ? "All Users View" : "Single User View"}
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-px bg-linear-to-b from-slate-200 to-slate-300">
        {(() => {
          // Generate weekday headers starting from the actual first day's weekday
          const firstDay = days[0];
          const allWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const startDayIndex = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
          
          // Create ordered weekdays starting from the first day's weekday
          const orderedWeekdays = [];
          for (let i = 0; i < 7; i++) {
            orderedWeekdays.push(allWeekdays[(startDayIndex + i) % 7]);
          }
          
          return orderedWeekdays.map((day) => (
            <div 
              key={day} 
              className="bg-linear-to-b from-slate-50 to-slate-100 px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200"
            >
              {day}
            </div>
          ));
        })()}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-px bg-linear-to-b from-slate-200 to-slate-300">
        {days.map((dateObj) => {
          const key = format(dateObj, "yyyy-MM-dd");
          const inMonth = isSameMonth(dateObj, currentMonth);
          const isSelected = selectedDate && isSameDay(dateObj, selectedDate);
          const isToday = isSameDay(dateObj, today);

          if (isAll) {
            const agg = dayAggByDate.get(key);
            const holiday = agg?.holiday ?? null;

            const pillStatus: Status =
              holiday ? "HOLIDAY" : agg?.weekOff ? "WEEK_OFF" : agg?.upcoming ? "UPCOMING" : agg && agg.absent > 0 ? "ABSENT" : "PRESENT";

            return (
              <button
                key={key}
                onClick={() => onSelectDate(dateObj)}
                className={[
                  "group relative min-h-27.5 bg-linear-to-b from-white to-slate-50 p-3 text-left transition-all duration-200",
                  "hover:from-indigo-50 hover:to-purple-50 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1",
                  inMonth ? "text-slate-900" : "text-slate-400 bg-linear-to-b from-slate-50 to-slate-100",
                  isSelected ? "ring-2 ring-purple-500 ring-inset bg-linear-to-b from-purple-50 to-pink-50 shadow-lg" : "",
                  isToday ? "ring-2 ring-blue-400 ring-inset bg-linear-to-b from-blue-50 to-indigo-50" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={[
                    "text-sm font-bold",
                    isToday ? "text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full" : ""
                  ].join(" ")}>
                    {format(dateObj, "d")}
                  </div>
                  <StatusPill status={pillStatus} />
                </div>

                <div className="space-y-1.5">
                  {holiday ? (
                    <div className="text-xs font-semibold text-blue-700 line-clamp-2 bg-linear-to-r from-blue-100 to-indigo-100 px-2 py-1 rounded-lg border border-blue-200">
                      {holiday.name}
                    </div>
                  ) : null}

                  {!holiday && agg && !agg.weekOff && !agg.upcoming ? (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-700 group-hover:text-slate-900 bg-linear-to-r from-emerald-50 to-teal-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <span className="text-emerald-600 flex">Present: {agg.present}</span>
                        {/* <span className="mx-1">•</span> */}
                        <span className="text-rose-600">Absent: {agg.absent}</span>
                      </div>
                      {agg.late > 0 ? (
                        <div className="text-[11px] text-amber-700 bg-linear-to-r from-amber-100 to-orange-100 px-2 py-1 rounded-lg border border-amber-200">
                          Late: {agg.late}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400"> </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic bg-linear-to-r from-slate-50 to-slate-100 px-2 py-1 rounded-lg">
                      {agg?.weekOff ? "Week Off" : agg?.upcoming ? "Upcoming" : ""}
                    </div>
                  )}
                </div>
              </button>
            );
          }

          // Single user mode
          const punch = punchesByDate.get(key) ?? null;
          const holiday = getHolidayForDate(holidaysByDate, key);
          const backendStatus = calendarStatusByDate.get(key) ?? null;

          const computed = backendStatus ?? computeStatus({
            date: dateObj,
            today,
            shiftStart,
            graceMinutes,
            weekOffDays,
            punch,
            holiday,
          });

          const missed = isMissedLoginToday({
            date: dateObj,
            today,
            shiftStart,
            graceMinutes,
            punch,
          });

          const dayLine = getDayLine(computed.status);

          return (
            <button
              key={key}
              onClick={() => onSelectDate(dateObj)}
              className={[
                "group relative min-h-27.5 bg-linear-to-b from-white to-slate-50 p-3 text-left transition-all duration-200",
                "hover:from-indigo-50 hover:to-purple-50 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1",
                inMonth ? "text-slate-900" : "text-slate-400 bg-linear-to-b from-slate-50 to-slate-100",
                isSelected ? "ring-2 ring-purple-500 ring-inset bg-linear-to-b from-purple-50 to-pink-50 shadow-lg" : "",
                isToday ? "ring-2 ring-blue-400 ring-inset bg-linear-to-b from-blue-50 to-indigo-50" : "",
                missed ? "border-2 border-red-400 animate-pulse" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={[
                  "text-sm font-bold",
                  isToday ? "text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full" : ""
                ].join(" ")}>
                  {format(dateObj, "d")}
                </div>
                <StatusPill status={computed.status} />
              </div>

              <div className="space-y-1.5">
                {dayLine ? (
                  <div className="text-[11px] font-semibold text-slate-700 group-hover:text-slate-900 bg-linear-to-r from-slate-50 to-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                    {dayLine}
                  </div>
                ) : null}

                {holiday ? (
                  <div className="text-xs font-semibold text-blue-700 line-clamp-2 bg-linear-to-r from-blue-100 to-indigo-100 px-2 py-1 rounded-lg border border-blue-200">
                    {holiday.name}
                  </div>
                ) : null}

                {punch ? (
                  <div className="text-xs text-slate-700 bg-linear-to-r from-emerald-50 to-teal-50 px-2 py-1 rounded-lg border border-emerald-200">
                    <span className="font-semibold">IN</span> {punch.inTime}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-linear-to-r from-slate-50 to-slate-100 px-2 py-1 rounded-lg">
                    {computed.status === "UPCOMING" ? "" : "No IN"}
                  </div>
                )}

                {computed.status === "LATE" ? (
                  <div className="text-[11px] text-amber-700 bg-linear-to-r from-amber-100 to-orange-100 px-2 py-1 rounded-lg border border-amber-200">
                    {computed.label}
                  </div>
                ) : null}

                {missed ? (
                  <div className="text-[11px] font-semibold text-red-700 bg-linear-to-r from-red-100 to-pink-100 px-2 py-1 rounded-lg border border-red-200 animate-pulse">
                    Missed login (after {lateAfter})
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
