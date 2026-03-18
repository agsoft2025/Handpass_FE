import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { DashboardResponse } from "../types/dashTypes";

export function useDashboard(page = 1) {
    return useQuery({
        queryKey: ["dashboard", page],
        queryFn: async (): Promise<DashboardResponse> => {
            const res = await api.get(`/api/dashboard`);
            return res.data;
        },
        staleTime: 1000 * 60,
        retry: false,
    });
}