import { useMemo, useState, useEffect } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  HeaderBar,
  CalendarGrid,
  Drawer,
  DayDetailsDrawerContent,
  StatCard,
  ProgressBar,
  ALL_USERS,
  toMinutes,
  minutesToHHMM,
  calculateMonthStats,
  computeStatus,
  getHolidayForDate,
  type InPunch,
  type Holiday,
  type Status,
  type DayAgg,
} from "../components/attendance";
import { useCreateShift, useShift, useUpdateShift, useUserAttendance } from "../service/useSettings";
import { useFetchUserWithGroup } from "../service/useUsers";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, TextField, Typography } from "@mui/material";
import type {
  MonthlySummaryAttendanceRow,
  ShiftConfig,
  SingleUserAttendanceRow,
} from "../types/settingTypes";

type NormalizedCalendarDay = {
  date: string;
  status: Status;
  inTime: string | null;
};

const DEFAULT_ATTENDANCE_STATE = {
  presentCount: 0,
  absentCount: 0,
  workingDays: 0,
  attendanceRate: "0.00",
  calendar: [] as NormalizedCalendarDay[],
  calendarStatusByDate: new Map<string, { status: Status; label: string }>(),
  punchesByDate: new Map<string, InPunch>(),
  holidaysByDate: new Map<string, Holiday>(),
  summaryAggByDate: new Map<string, DayAgg>(),
};

function normalizeAttendanceDate(value: string) {
  return format(new Date(value), "yyyy-MM-dd");
}

function normalizeAttendanceStatus(status: string | null | undefined): Status {
  switch ((status ?? "").toUpperCase()) {
    case "PRESENT":
      return "PRESENT";
    case "LATE":
      return "LATE";
    case "WEEK_OFF":
    case "WEEKOFF":
      return "WEEK_OFF";
    case "HOLIDAY":
      return "HOLIDAY";
    case "UPCOMING":
      return "UPCOMING";
    default:
      return "ABSENT";
  }
}

function getStatusLabel(status: Status) {
  switch (status) {
    case "PRESENT":
      return "On time";
    case "LATE":
      return "Late";
    case "WEEK_OFF":
      return "Week Off";
    case "HOLIDAY":
      return "Holiday";
    case "UPCOMING":
      return "";
    default:
      return "No IN";
  }
}

function toDisplayTime(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
}

export default function AttendanceModule() {
  // Fetch real users from API
  const { data: usersData } = useFetchUserWithGroup({ page: 1, limit: 100 });
  const users = usersData?.data || [];

  // Demo "now": use actual current date
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));

  // User selection
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Set initial user when data loads
  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  // Shift config
  const [shiftName, setShiftName] = useState<string>("General");
  const [shiftStart, setShiftStart] = useState<string>("09:00");
  const [shiftEnd, setShiftEnd] = useState<string>("19:00");
  const [graceMinutes, setGraceMinutes] = useState<number>(15);
  const [weekOffDays, setWeekOffDays] = useState<number[]>([0]); // Sunday
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const { data: shiftList = [], isLoading: isShiftLoading } = useShift(isShiftDialogOpen);
  const createShiftMutation = useCreateShift();
  const updateShiftMutation = useUpdateShift();
  const [selectedShiftKey, setSelectedShiftKey] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [hasInitializedShiftSelection, setHasInitializedShiftSelection] = useState(false);
  const [formShiftName, setFormShiftName] = useState<string>("");
  const [formShiftStart, setFormShiftStart] = useState<string>("");
  const [formShiftEnd, setFormShiftEnd] = useState<string>("");
  const [formGraceMinutes, setFormGraceMinutes] = useState<number>(0);
  const [formWeekOffDays, setFormWeekOffDays] = useState<number[]>([]);

  // Drawer state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getShiftKey = (shift: ShiftConfig, index: number) =>
    String(shift.id ?? shift._id ?? `${shift.shift_name}-${shift.start_time}-${index}`);

  const applyShiftToForm = (shift: ShiftConfig) => {
    setFormShiftName(shift.shift_name ?? "");
    setFormShiftStart(shift.start_time ?? "");
    setFormShiftEnd(shift.end_time ?? "");
    setFormGraceMinutes(Number(shift.grace_minutes ?? 0));
    setFormWeekOffDays(Array.isArray(shift.weekly_off_days) ? shift.weekly_off_days : []);
  };

  const getShiftId = (shift: ShiftConfig): string | null => {
    const rawId = shift.id ?? shift._id;
    return rawId ? String(rawId) : null;
  };

  const applyShiftToMainState = (shift: ShiftConfig) => {
    setShiftName(shift.shift_name ?? "General");
    setShiftStart(shift.start_time ?? "09:00");
    setShiftEnd(shift.end_time ?? "19:00");
    setGraceMinutes(Number(shift.grace_minutes ?? 15));
    setWeekOffDays(Array.isArray(shift.weekly_off_days) ? shift.weekly_off_days : [0]);
  };

  useEffect(() => {
    if (!shiftList.length) return;
    if (selectedShiftKey || hasInitializedShiftSelection) return;
    const firstShift = shiftList[0];
    setSelectedShiftKey(getShiftKey(firstShift, 0));
    setSelectedShiftId(getShiftId(firstShift));
    applyShiftToForm(firstShift);
    applyShiftToMainState(firstShift);
    setHasInitializedShiftSelection(true);
  }, [shiftList, selectedShiftKey, hasInitializedShiftSelection]);

  // API call for attendance data - only when we have a valid user ID
  const attendancePayload = useMemo(() => {
    if (!selectedUserId) return null;
    const payload = {
      month: currentMonth.getMonth() + 1, // API expects 1-12
      year: currentMonth.getFullYear(),
    };
    if (selectedUserId !== ALL_USERS) {
      return {
        ...payload,
        user_id: selectedUserId,
      };
    }
    return payload;
  }, [selectedUserId, currentMonth]);

  const { data: attendanceData } = useUserAttendance(attendancePayload);

  // Process API data into our existing format
  const processedAttendanceData = useMemo(() => {
    if (!attendanceData?.data?.length) {
      return DEFAULT_ATTENDANCE_STATE;
    }

    const punchesByDate = new Map<string, InPunch>();
    const holidaysByDate = new Map<string, Holiday>();
    const calendarStatusByDate = new Map<string, { status: Status; label: string }>();
    const summaryAggByDate = new Map<string, DayAgg>();
    const calendar: NormalizedCalendarDay[] = [];

    let presentCount = 0;
    let absentCount = 0;
    let workingDays = 0;

    if (attendanceData.type === "monthly_summary") {
      (attendanceData.data as MonthlySummaryAttendanceRow[]).forEach((row) => {
        const date = normalizeAttendanceDate(row.attendance_date);
        const present = Number(row.present ?? 0);
        const late = Number(row.late ?? 0);
        const halfDay = Number(row.half_day ?? 0);
        const absent = Number(row.absent ?? 0);
        const weekOff = Number(row.week_off ?? 0);
        const effectivePresent = present + late + halfDay;

        let status: Status = "ABSENT";
        if (weekOff > 0) status = "WEEK_OFF";
        else if (late > 0) status = "LATE";
        else if (effectivePresent > 0) status = "PRESENT";
        else if (absent === 0) status = "UPCOMING";

        calendar.push({
          date,
          status,
          inTime: null,
        });

        calendarStatusByDate.set(date, {
          status,
          label: getStatusLabel(status),
        });

        summaryAggByDate.set(date, {
          present: effectivePresent,
          absent,
          late,
          holiday: null,
          weekOff: weekOff > 0,
          upcoming: status === "UPCOMING",
          details: [],
        });

        presentCount += effectivePresent;
        absentCount += absent;
        if (weekOff === 0 && status !== "UPCOMING") {
          workingDays += 1;
        }
      });
    } else {
      (attendanceData.data as SingleUserAttendanceRow[]).forEach((row) => {
        const date = normalizeAttendanceDate(row.attendance_date);
        const status = normalizeAttendanceStatus(row.status);
        const inTime = toDisplayTime(row.check_in);

        calendar.push({
          date,
          status,
          inTime,
        });

        calendarStatusByDate.set(date, {
          status,
          label: getStatusLabel(status),
        });

        if (inTime) {
          punchesByDate.set(date, {
            userId: selectedUserId,
            date,
            inTime,
          });
        }

        if (status === "PRESENT" || status === "LATE") presentCount += 1;
        if (status === "ABSENT") absentCount += 1;
        if (status !== "WEEK_OFF" && status !== "HOLIDAY" && status !== "UPCOMING") {
          workingDays += 1;
        }
      });
    }

    const attendanceRate =
      workingDays > 0 ? ((presentCount / workingDays) * 100).toFixed(2) : "0.00";

    return {
      presentCount,
      absentCount,
      workingDays,
      attendanceRate,
      calendar,
      calendarStatusByDate,
      punchesByDate,
      holidaysByDate,
      summaryAggByDate,
    };
  }, [attendanceData, selectedUserId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  // Use actual API data range instead of calculating month boundaries
  const firstApiDate = processedAttendanceData.calendar?.[0]?.date;
  const lastApiDate = processedAttendanceData.calendar?.[processedAttendanceData.calendar?.length - 1]?.date;
  const gridStart = firstApiDate ? new Date(firstApiDate) : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const gridEnd = lastApiDate ? new Date(lastApiDate) : new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 6);

  const lateAfterMinutes = toMinutes(shiftStart) + graceMinutes;
  const lateAfter = minutesToHHMM(lateAfterMinutes);

  const days: Date[] = useMemo(() => {
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    }
    return out;
  }, [gridStart, gridEnd]);

  // Use processed API data
  const punchesByDate = processedAttendanceData.punchesByDate;
  const holidaysByDate = processedAttendanceData.holidaysByDate;

  // ALL users aggregates for each day on grid (for calendar + drawer)
  const dayAggByDate = useMemo(() => {
    const m = new Map<string, DayAgg>();

    for (const dateObj of days) {
      const key = format(dateObj, "yyyy-MM-dd");
      const holiday = getHolidayForDate(holidaysByDate, key);
      const weekOff = isWeekOff(dateObj, weekOffDays);
      const upcoming = isAfter(dateObj, today);
      const apiSummary = processedAttendanceData.summaryAggByDate.get(key);

      const agg: DayAgg = {
        present: 0,
        absent: 0,
        late: 0,
        holiday,
        weekOff,
        upcoming,
        details: [],
      };

      if (selectedUserId === ALL_USERS && apiSummary) {
        m.set(key, {
          ...agg,
          present: apiSummary.present,
          absent: apiSummary.absent,
          late: apiSummary.late,
          weekOff: apiSummary.weekOff,
          upcoming: apiSummary.upcoming,
          details: apiSummary.details,
        });
        continue;
      }

      // For single user mode, use the API calendar data
      if (selectedUserId !== ALL_USERS) {
        const calendarDay = processedAttendanceData.calendar?.find(
          (day) => day.date === key
        );

        if (calendarDay && !holiday && !upcoming) {
          if (calendarDay.status === "PRESENT") {
            agg.present = 1;
            agg.weekOff = false;
          } else if (calendarDay.status === "LATE") {
            agg.present = 1;
            agg.late = 1;
            agg.weekOff = false;
          } else if (calendarDay.status === "ABSENT") {
            agg.absent = 1;
            agg.weekOff = false;
          } else if (calendarDay.status === "WEEK_OFF") {
            agg.weekOff = true;
          }

          agg.details.push({
            userId: selectedUserId,
            userName: "User",
            status: calendarDay.status,
            inTime: calendarDay.inTime ?? undefined,
            note: calendarDay.status,
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
    processedAttendanceData.calendar,
    selectedUserId,
    ALL_USERS,
  ]);

  // Use API data for stats
  const monthStats = useMemo(() => {
    if (selectedUserId === ALL_USERS) {
      // For ALL users, we'd need to make multiple API calls or have a different endpoint
      return calculateMonthStats({
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
        users: users,
      });
    } else {
      // Use real API data for single user
      return {
        present: processedAttendanceData.presentCount,
        absent: processedAttendanceData.absentCount,
        workingDays: processedAttendanceData.workingDays,
      };
    }
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
    processedAttendanceData,
    [],
  ]);

  // Helper function for week off check
  function isWeekOff(date: Date, weekOffDays: number[]) {
    return weekOffDays.includes(date.getDay());
  }

  // Helper function for date comparison
  function isAfter(date1: Date, date2: Date) {
    return date1 > date2;
  }

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedHoliday = selectedKey ? getHolidayForDate(holidaysByDate, selectedKey) : null;
  const selectedPunch = selectedKey && selectedUserId !== ALL_USERS ? punchesByDate.get(selectedKey) ?? null : null;
  const selectedComputed = selectedDate && selectedUserId !== ALL_USERS
    ? processedAttendanceData.calendarStatusByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? computeStatus({
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
    ? `Day Details • ${format(selectedDate, "yyyy-MM-dd")} • ${selectedUserId === ALL_USERS
      ? "All Users"
      : users.find((u: any) => u.id === selectedUserId)?.name ?? "User"
    }`
    : "Day Details";

  const todayLabel = format(today, "yyyy-MM-dd HH:mm");
  const isSavingShift = createShiftMutation.isPending || updateShiftMutation.isPending;
  const isCreateMode = selectedShiftKey === null;
  const canUpdateShift = !isCreateMode && !!selectedShiftId;
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const toggleWeekOffDay = (dayIndex: number, checked: boolean) => {
    setFormWeekOffDays((prev) => {
      if (checked) {
        return prev.includes(dayIndex) ? prev : [...prev, dayIndex].sort((a, b) => a - b);
      }
      return prev.filter((d) => d !== dayIndex);
    });
  };

  const shiftPayload = {
    shift_name: formShiftName,
    start_time: formShiftStart,
    end_time: formShiftEnd,
    grace_minutes: formGraceMinutes,
    weekly_off_days: formWeekOffDays,
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="mx-auto py-6 px-4">

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <StatCard
              title="Present (incl. Late)"
              value={monthStats.present}
              subtitle={`For ${format(currentMonth, "MMMM yyyy")}`}
              icon={<div className="h-5 w-5 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </div>}
              accent="from-emerald-500 to-teal-600"
            />
            <ProgressBar
              value={monthStats.present}
              total={Math.max(1, monthStats.workingDays)}
              color="emerald"
            />
          </div>

          <div>
            <StatCard
              title="Absent"
              value={monthStats.absent}
              subtitle={
                selectedUserId === ALL_USERS
                  ? `Working days: ${monthStats.workingDays} • Users: ${users.length}`
                  : `Working days counted: ${monthStats.workingDays}`
              }
              icon={<div className="h-5 w-5 rounded-full bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                <XCircle className="h-3 w-3 text-white" />
              </div>}
              accent="from-rose-500 to-pink-600"
            />
            <ProgressBar
              value={monthStats.absent}
              total={Math.max(1, monthStats.workingDays)}
              color="rose"
            />
          </div>
        </div>

        <div className="mb-4">
          {/* <Button className="!bg-primary !text-white" onClick={() => setIsShiftDialogOpen(true)}>
            View Shift
          </Button> */}
        </div>

        {/* Header */}
        <HeaderBar
          selectedUserId={selectedUserId}
          onChangeUser={setSelectedUserId}
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 items-start">
          {/* Calendar */}
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
            calendarStatusByDate={processedAttendanceData.calendarStatusByDate}
            dayAggByDate={dayAggByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Settings Panel */}
          {/* <ShiftSettingsPanel
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
          /> */}
        </div>

        {/* Drawer */}
        <Drawer open={!!selectedDate} onClose={() => setSelectedDate(null)} title={drawerTitle}>
          {selectedDate ? (
            <DayDetailsDrawerContent
              selectedUserId={selectedUserId}
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

        <Dialog open={isShiftDialogOpen} onClose={() => setIsShiftDialogOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>Shift Details</DialogTitle>
          <DialogContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-lg border p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="subtitle1" className="font-semibold!">
                    Shift List
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setSelectedShiftKey(null);
                      setSelectedShiftId(null);
                      setHasInitializedShiftSelection(true);
                      setFormShiftName("");
                      setFormShiftStart("");
                      setFormShiftEnd("");
                      setFormGraceMinutes(0);
                      setFormWeekOffDays([]);
                    }}
                  >
                    Create
                  </Button>
                </div>
                {isShiftLoading ? (
                  <Typography variant="body2">Loading shift...</Typography>
                ) : !shiftList.length ? (
                  <Typography variant="body2">No shifts found.</Typography>
                ) : (
                  <div className="space-y-2">
                    {shiftList.map((shift, index) => {
                      const shiftKey = getShiftKey(shift, index);
                      const selected = selectedShiftKey === shiftKey;
                      return (
                        <button
                          key={shiftKey}
                          type="button"
                          className={`w-full text-left rounded border p-3 ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
                          onClick={() => {
                            setSelectedShiftKey(shiftKey);
                            setSelectedShiftId(getShiftId(shift));
                            applyShiftToForm(shift);
                            applyShiftToMainState(shift);
                          }}
                        >
                          <Typography variant="body2" className="font-semibold!">
                            {shift.shift_name}
                          </Typography>
                          <Typography variant="caption" className="text-slate-600!">
                            {shift.start_time} - {shift.end_time} | Grace {shift.grace_minutes}m | Off: {((shift.weekly_off_days || []) as number[])
                              .map((day) => weekDays[day] ?? day)
                              .join(", ")}
                          </Typography>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <Typography variant="subtitle1" className="font-semibold! mb-3!">
                  Shift Form (Create/Update)
                </Typography>
                <div className="grid grid-cols-1 gap-3">
                  <TextField
                    label="Shift Name"
                    value={formShiftName}
                    onChange={(e) => setFormShiftName(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Start Time"
                    value={formShiftStart}
                    onChange={(e) => setFormShiftStart(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="End Time"
                    value={formShiftEnd}
                    onChange={(e) => setFormShiftEnd(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Grace Minutes"
                    type="number"
                    value={formGraceMinutes}
                    onChange={(e) => setFormGraceMinutes(Number(e.target.value || 0))}
                    fullWidth
                  />
                  <div>
                    <Typography variant="body2" className="mb-1! font-medium!">
                      Weekly Off Days
                    </Typography>
                    <FormGroup row>
                      {weekDays.map((label, index) => (
                        <FormControlLabel
                          key={label}
                          control={
                            <Checkbox
                              checked={formWeekOffDays.includes(index)}
                              onChange={(_, checked) => toggleWeekOffDay(index, checked)}
                            />
                          }
                          label={label}
                        />
                      ))}
                    </FormGroup>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
             <Button color="error" variant="outlined" onClick={() => setIsShiftDialogOpen(false)}>
              Close
            </Button>
            <Button
              variant="outlined"
              disabled={isSavingShift}
              onClick={() =>
                createShiftMutation.mutate(shiftPayload, {
                  onSuccess: () => {
                    setSelectedShiftKey(null);
                  },
                })
              }
            >
              Create
            </Button>
            <Button
              variant="contained"
              disabled={isSavingShift || !canUpdateShift}
              onClick={() => {
                if (!selectedShiftId) return;
                updateShiftMutation.mutate({ id: selectedShiftId, payload: shiftPayload });
              }}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
