export type Attendance = {
  id: number;
  work_start_time: string;   // "HH:MM:SS"
  work_end_time: string;     // "HH:MM:SS"
  weekly_holidays: number[]; // 0-6 (Sun-Sat)
  is_active: boolean;
  updated_at: string;        // ISO timestamp
};

export type AttendanceResponse = {
  data: Attendance;
};

export type AttendancePayload = {
  month: number;
  year: number;
  user_id?: string;
};

export type MonthlySummaryAttendanceRow = {
  attendance_date: string;
  present: string;
  late: string;
  half_day: string;
  absent: string;
  week_off: string;
};

export type SingleUserAttendanceRow = {
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  work_minutes: number | null;
  status: string;
};

export type AttendanceApiResponse = {
  success: boolean;
  type: "monthly_summary" | "single_user";
  data: MonthlySummaryAttendanceRow[] | SingleUserAttendanceRow[];
};

export type ShiftConfig = {
  id?: string | number;
  _id?: string | number;
  shift_name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  weekly_off_days: number[];
};

export type ShiftResponse = {
  data: ShiftConfig;
};
