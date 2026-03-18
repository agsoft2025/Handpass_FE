export interface DashboardResponse {
  status: boolean;
  data: DashboardData;
}

export interface DashboardData {
  totalUsers: number;
  activeDevices: number;
  todayGranted: number;
  todayDenied: number;
  recentLogs: RecentLog[];
}

export interface RecentLog {
  id: string;
  sn: string;
  name: string;
  user_id: string;
  palm_type: string;
  device_date_time: string; // ISO datetime string
  created_at: string;       // ISO datetime string
}
