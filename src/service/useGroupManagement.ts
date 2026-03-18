import {  useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GroupApiResponse, ViewGroupResponse } from "../types/groupManagement";

export function useGroupManagent(page = 1, limit = 10, enabled = true) {
  return useQuery<GroupApiResponse>({
    queryKey: ["groupManagement", page, limit],
    queryFn: async (): Promise<GroupApiResponse> => {
      const res = await api.get(`/api/group?page=${page}&limit=${limit}`);
      return res.data;
    },
    enabled,
    staleTime: 1000 * 60,
    retry: false,
  });
}

export function useGroupViewMember(page = 1,limit=10, id: string) {
    return useQuery({
        queryKey: ["groupViewManagement", page,limit,id],
        enabled: !!id,
        queryFn: async (): Promise<ViewGroupResponse> => {
            const res = await api.get(`/api/group/group-members/${id}?page=${page}&limit=${limit}`);
            return res.data;
        },
        staleTime: 1000 * 60,
        retry: false,
    });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/group", payload);
      return res.data;
    },
    onSuccess: () => {
      // Refetch user list after creation
      queryClient.invalidateQueries({ queryKey: ["groupManagement"] });
    }
  });
}
