export interface FirmwareCheckData {
  sn: string;
  version: string;
}

export interface FirmwareCheckResponse {
  success: boolean;
  message: string;
  updateAvailable?: boolean;
  latestVersion?: string;
  downloadUrl?: string;
  currentVersion?: string;
  deviceStatus?: string;
}
