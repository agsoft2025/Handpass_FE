export type User = { id: string; name: string };

export type InPunch = {
  userId: string;
  date: string; // yyyy-MM-dd
  inTime: string | null; // HH:mm or null for absent days
};

export type Holiday = {
  date: string; // yyyy-MM-dd
  name: string;
};

export type Status = "PRESENT" | "LATE" | "ABSENT" | "HOLIDAY" | "WEEK_OFF" | "UPCOMING";

export type ComputedStatus = {
  status: Status;
  label: string;
};

export type DayUserDetail = {
  userId: string;
  userName: string;
  status: Status;
  inTime?: string;
  note?: string;
};

export type DayAgg = {
  present: number; // includes LATE
  absent: number;
  late: number;
  holiday?: Holiday | null;
  weekOff: boolean;
  upcoming: boolean;
  details: DayUserDetail[];
};

export type MonthStats = {
  present: number;
  absent: number;
  workingDays: number;
};

export const ALL_USERS = "ALL" as const;
export type AllUsersType = typeof ALL_USERS;
