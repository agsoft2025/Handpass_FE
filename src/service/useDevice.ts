// services/useDevices.ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { DeviceResponse } from "../types/deviceTypes";

export function getDevicesQueryOptions(page = 1, search = "", limit?: number) {
  return {
    queryKey: ["devices", page, search, limit ?? "all"],
    queryFn: async (): Promise<DeviceResponse> => {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;

      // Only send pagination params when a limit is explicitly provided.
      // Many screens use this hook for dropdowns/autocomplete and expect "all" devices.
      if (typeof limit === "number") {
        params.page = page;
        params.limit = limit;
      }

      const res = await api.post(`/v1/device/getAll`, undefined, {
        params: Object.keys(params).length ? params : undefined,
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    retry: false,
  };
}

export function useDevices(page = 1, search = "", enabled = true, limit?: number) {
  return useQuery<DeviceResponse>({
    ...getDevicesQueryOptions(page, search, limit),
    enabled,
  });
}

// update device
export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      // return api.put(`/api/users/update-user/${id}`, {
      //   name,
      // });
      return api.put(`/v1/connect/${id}`, {
        device_name:name,
      });
    },

    onSuccess: () => {
      // Refetch devices after success
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

// Delete device
export function useDeleteDevice() {
  const queryClient = useQueryClient();

  // DO NOT type the return value
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/connect/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },

    onError: (err: any) => {
      console.error("Delete failed:", err);
    },
  });
}
