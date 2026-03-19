import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface TimeConfigPayload {
  start: number;
  end: number;
  weekdays: number;
}

export interface TimeGroupItem {
  id: string;
  time_group_id: string;
  timestamp: string;
  del_flag: boolean;
  time_configs: TimeConfigPayload[];
}

export function useTimeGroups(delFlag = 0, enabled = true, page?: number, limit?: number, search?: string) {
  return useQuery<any>({
    queryKey: ["timeGroups", delFlag, page ?? "all", limit ?? "all", search ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("del_flag", String(delFlag));
      if (typeof page === "number" && typeof limit === "number") {
        params.set("page", String(page));
        params.set("limit", String(limit));
      }
      if (search) params.set("search", search);
      const res = await api.get(`/v1/api/time_groups?${params.toString()}`);
      return res.data;
    },
    enabled,
    staleTime: 1000 * 60,
    retry: false,
  } as any);
}

export type CreateTimeGroupPayload = {
  time_group_id: string;
  del_flag: number;
  time_configs: TimeConfigPayload[];
};

export function useCreateTimeGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTimeGroupPayload) => {
      const res = await api.post("/v1/api/time_groups", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeGroups"], exact: false });
    },
  });
}

export function useUpdateTimeGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateTimeGroupPayload }) => {
      const res = await api.put(`/v1/api/time_groups/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeGroups"], exact: false });
    },
  });
}

export function useSoftDeleteTimeGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { time_group_id: string }) => {
      const res = await api.delete(`/v1/api/time_groups/delete`, { data: payload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeGroups"], exact: false });
    },
  });
}
