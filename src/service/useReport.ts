import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ReportPayload, ReportResponse } from "../types/reportTypes";

export function useReportsMutation() {
  return useMutation<ReportResponse, Error, ReportPayload>({
    mutationFn: async (payload: ReportPayload) => {
      const res = await api.post<ReportResponse>(
        `/api/report/access-list`,
        payload
      );
      return res.data;
    },
     retry: false,
  });
}


export function useReportsPolling(payload?: ReportPayload) {
  return useQuery<ReportResponse>({
    queryKey: ["reports-poll", payload],
    queryFn: async () => {
      const res = await api.post<ReportResponse>(
        `/api/report/access-list`,
        payload ?? {}
      );
      return res.data;
    },
    refetchInterval: 60000,  // 🔁 every 5 seconds
    refetchOnWindowFocus: false,
  });
}

export type AccessListPayload = {
  report_type?: string;
  page?: number;
  limit?: number | "all";
  sortField?: string;
  sortOrder?: "asc" | "desc";
  id?: string;
  user_id?: string;
  sn?: string | null;
  name?: string | null;
  format?: string;
  start_date?: unknown;
  end_date?: unknown;
};

export function useAccessListQuery<TData = any>(
  payload: AccessListPayload,
  enabled: boolean,
  refetchInterval: number | false = 60000
) {
  return useQuery<TData>({
    queryKey: ["access-list", payload],
    queryFn: async () => {
      const res = await api.post<TData>(`/api/report/access-list`, payload);
      return res.data;
    },
    enabled,
    refetchInterval,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useAccessListMutation() {
  return useMutation({
    mutationFn: async (payload: AccessListPayload) => {
      const format = payload.format ?? "json";
      const responseType = format === "json" ? "json" : "blob";
      const res = await api.post(`/api/report/access-list`, payload, {
        responseType: responseType as any,
      });
      return res.data;
    },
    retry: false,
  });
}



