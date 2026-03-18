// services/useFirmware.ts
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

interface FirmwareCheckData {
  sn: string;
  version: string;
}

interface FirmwareCheckResponse {
  success: boolean;
  message: string;
  updateAvailable?: boolean;
  latestVersion?: string;
  downloadUrl?: string;
}

export function useFirmwareCheck() {
  return useMutation({
    mutationFn: async (data: FirmwareCheckData): Promise<FirmwareCheckResponse> => {
      const res = await api.post(`/v1/firmware_upgrade`, data);
      return res.data;
    },
  });
}
