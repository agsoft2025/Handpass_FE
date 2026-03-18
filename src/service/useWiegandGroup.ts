import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

interface TimeConfigPayload {
  start: number;
  end: number;
  weekdays: number;
}

export interface CreateWiegandGroupPayload {
  group_id: string;
  sn: string;
  timestamp: number;
  del_flag: number;
  time_configs: TimeConfigPayload[];
}

export interface CreateUserWiegandPayload {
  sn: string;
  user_id: string;
  group_id: string;
  timestamp: number;
  del_flag: boolean;
}

export interface UpdateUserWiegandPayload {
  sn: string;
  user_id: string;
  group_id: string;
  timestamp: number;
}

export function useWiegandGroups(delFlag = 0, enabled = true, page?: number, limit?: number) {
  return useQuery<any>({
    queryKey: ["wiegandGroups", delFlag, page ?? "all", limit ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("del_flag", String(delFlag));
      if (typeof page === "number" && typeof limit === "number") {
        params.set("page", String(page));
        params.set("limit", String(limit));
      }
      const res = await api.get(`/v1/api/wiegand_groups?${params.toString()}`);
      return res.data;
    },
    enabled,
    staleTime: 1000 * 60,
    retry: false,
  } as any);
}

export function useUserWiegands(enabled = true, page?: number, limit?: number) {
  return useQuery<any>({
    queryKey: ["userWiegands", page ?? "all", limit ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("del_flag", "false");
      if (typeof page === "number" && typeof limit === "number") {
        params.set("page", String(page));
        params.set("limit", String(limit));
      }
      const res = await api.get(`/v1/api/user_wiegands?${params.toString()}`);
      return res.data;
    },
    staleTime: 1000 * 60,
    retry: false,
    enabled,
  } as any);
}

export function useCreateUserWiegand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserWiegandPayload) => {
      const res = await api.post("/v1/api/user_wiegands", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userWiegands"], exact: false });
    },
  });
}

export function useDeleteUserWiegand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/v1/api/user_wiegands/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userWiegands"], exact: false });
    },
  });
}

export function useUpdateUserWiegand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateUserWiegandPayload }) => {
      const res = await api.put(`/v1/api/user_wiegands/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userWiegands"], exact: false });
    },
  });
}

export function useCreateWiegandGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWiegandGroupPayload) => {
      const res = await api.post("/v1/api/wiegand_groups", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiegandGroups"], exact: false });
    },
  });
}

export function useUpdateWiegandGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateWiegandGroupPayload;
    }) => {
      const res = await api.put(`/v1/api/wiegand_groups/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiegandGroups"], exact: false });
    },
  });
}
