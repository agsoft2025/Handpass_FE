import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  AttendanceApiResponse,
  AttendancePayload,
  AttendanceResponse,
  ShiftConfig,
} from "../types/settingTypes";

export function useAttenence(page: number = 1, limit: number = 5) {
 return useQuery<AttendanceResponse>({
  queryKey: ["attenence", page, limit],
  queryFn: async () => {
    // const searchParam = search ? `search=${search}` : ""
    const res = await api.get<AttendanceResponse>(`/api/attendance-settings?page=${page}&limit=${limit}`);
    return res.data;
  },
  staleTime: 1000 * 60,
  keepPreviousData: true,
  retry: false,
} as any);
}

export const createAttendance = ()=>{
     const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post(`/api/attendance-settings`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attenence"], exact: false });
    },
  });
}

export const useUserAttendance = (payload: AttendancePayload | null) => {
  return useQuery<AttendanceApiResponse>({
    queryKey: ["attendance", payload],
    queryFn: async () => {
      const { data } = await api.post<AttendanceApiResponse>("/api/attendance", payload);
      return data;
    },
    enabled: !!payload, // only runs when payload exists
  });
};

export const useShift = (enabled: boolean = true) => {
  return useQuery<ShiftConfig[]>({
    queryKey: ["shift"],
    queryFn: async () => {
      const { data } = await api.get("/api/shift");
      const payload = data?.data ?? data;
      if (Array.isArray(payload)) return payload;
      if (payload) return [payload];
      return [];
    },
    enabled,
    staleTime: 1000 * 60,
    retry: false,
  });
};

export const useCreateShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ShiftConfig) => {
      const { data } = await api.post("/api/shift", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift"], exact: false });
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ShiftConfig }) => {
      const { data } = await api.put(`/api/shift/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift"], exact: false });
    },
  });
};
