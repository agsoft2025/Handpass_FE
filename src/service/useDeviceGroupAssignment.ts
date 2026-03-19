import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface DeviceGroupAssignmentItem {
  id: string;
  sn: string;
  remote_group_id: string;
  time_group_id: string;
  timestamp: string;
  del_flag: boolean;
  device?: {
    name?: string;
  };
}

export type CreateDeviceGroupAssignmentPayload = {
  sn: string;
  remote_group_id: string;
  time_group_id: string;
  del_flag?: number | boolean;
};

export function useDeviceGroupAssignments(delFlag = 0, enabled = true, page?: number, limit?: number, search?: string) {
  return useQuery<any>({
    queryKey: ["deviceGroupAssignments", delFlag, page ?? "all", limit ?? "all", search ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("del_flag", String(delFlag));
      if (typeof page === "number" && typeof limit === "number") {
        params.set("page", String(page));
        params.set("limit", String(limit));
      }
      if (search) params.set("search", search);
      const res = await api.get(`/v1/api/device_group_assignments?${params.toString()}`);
      return res.data;
    },
    enabled,
    staleTime: 1000 * 60,
    retry: false,
  } as any);
}

export function useCreateDeviceGroupAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDeviceGroupAssignmentPayload) => {
      const res = await api.post(`/v1/api/device_group_assignments`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceGroupAssignments"], exact: false });
    },
  });
}

export function useUpdateDeviceGroupAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateDeviceGroupAssignmentPayload }) => {
      const res = await api.put(`/v1/api/device_group_assignments/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceGroupAssignments"], exact: false });
    },
  });
}

export function useSoftDeleteDeviceGroupAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sn: string; remote_group_id: string }) => {
      const res = await api.delete(`/v1/api/device_group_assignments/delete`, { data: payload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceGroupAssignments"], exact: false });
    },
  });
}
