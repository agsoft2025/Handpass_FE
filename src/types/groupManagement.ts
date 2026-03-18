// Device type
export interface GroupDevice {
  device_id: string;
  device_name: string | null;
  sn: string;
  device_ip: string;
  group_name: string;
}

// Group type
export interface Group {
  id: string;
  group_name: string;
  description: string;
  is_active: boolean;
  sn: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  devices: GroupDevice[];
}

// Pagination type
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// API response type
export interface GroupApiResponse {
  code: number;
  msg: string;
  data: Group[];
  pagination: Pagination;
}


// Root response
export interface ViewGroupResponse {
  code: number;
  msg: string;
  data: ViewGroupItem[];
  pagination: Pagination;
  device: [
    {device_name: string}
  ]
}

// Each data item
export interface ViewGroupItem {
  group_id: string;
  group_name: string;
  description: string | null;
  is_active: boolean;
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  wiegand_flag: number;
  admin_auth: number;
  is_allowed: boolean;
  added_at: string;
  id: string;
}

// Pagination object
export interface ViewPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}