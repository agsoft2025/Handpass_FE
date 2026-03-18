export type UserGroupTimeConfig = {
  end: number;
  start: number;
  weekdays: number;
};

export type UserGroup = {
  group_id: string;
  time_configs?: UserGroupTimeConfig[] | null;
};

export type UserData = {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  role: string;
  sn: string;
  user_id: string;
  image_left: string;
  wiegand_flag: number;
  admin_auth: number;
  groups?: UserGroup[];
  created_at: string;
  updated_at: string;
};

export type UserPagination = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export type UserResponse = {
  code: number;
  msg: string;
  data: UserData[];
  pagination: UserPagination;
};


// single user
export interface SingleUserWithGroupsResponse {
  code: number;
  msg: string;
  data: UserWithGroups;
}

export interface UserWithGroups {
  id: string;
  name: string;
  email: string | null;
  phone_number?: string | null;
  password_hash: string | null;
  sn: string | null;
  user_id: string | null;
  role: string;
  image_left: string | null;
  image_right: string | null;
  wiegand_flag: number;
  admin_auth: number;
  created_at: string;
  updated_at: string;
}


// user related group
export interface User {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  role: string;
  sn: string | null;
  admin_auth?: number;
  user_id?: string;
  wiegand_flag?: number;
  created_at?: string;
  updated_at?: string;
  group_count?: string;
  groups?: unknown[];
}

export interface Pagination {
  has_next: boolean;
  has_prev: boolean;
  limit: number;
  page: number;
  total: number;
  total_pages: number;
}

export interface UserRelatedResponse {
  code: number;
  msg: string;
  data: User[];
  pagination: Pagination;
}
