export interface ReportItem {
  id: string;
  sn: string;
  name: string;
  user_id: string;
  palm_type: string;
  device_date_time: string;
  created_at: string;
}

export interface ReportResponse {
  success: boolean;
  totalCount: number;
  data: ReportItem[];
}

export interface ReportPayload {
  sn: string | null | undefined;
  name: UserOption | null;
  format: string;
  start_date: any | null;
  end_date: any | null;
}

interface UserOption {
  id: string;
  name: string;
  sn: string;
  // add extra fields if needed
}