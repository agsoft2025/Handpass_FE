// types/device.ts
export type Device = {
  id: string;
  sn: string;
  device_name: string | null;
  device_ip: string;
  online_status: number;
  last_connect_time: string;
  firmware_version: string;
  created_at: string;
  updated_at: string;
};

export type DeviceResponse = {
  status: boolean;
  message: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  data: Device[];
};
