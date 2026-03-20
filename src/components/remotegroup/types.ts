export type UserOption = {
  id: string;
  label: string;
};

export type DeviceSnOption = {
  sn: string;
  label: string;
};

export type GroupIdOption = {
  group_id: string;
  sn: string;
  device_name?: string;
};

export type TimeGroupOption = {
  time_group_id: string;
  label: string;
  time_configs: any[];
};
