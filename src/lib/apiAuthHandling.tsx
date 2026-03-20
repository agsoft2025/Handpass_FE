import { useEffect } from "react";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "./api";

export function useApiInterceptor() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const requestUrl = String((error.config as any)?.url ?? "");
        const isAuthBootstrapCall = requestUrl.includes("/api/auth/me");
        const skipErrorToast = Boolean((error.config as any)?.skipErrorToast);
        const method = String((error.config as any)?.method ?? "").toLowerCase();
        const isGetCall = method === "get";

        if (error.response) {
          const status = error.response.status;

          if ((status === 401 || status === 403) && isAuthBootstrapCall) {
            return Promise.reject(error);
          }

          if ((status === 401 || status === 403) && !isAuthBootstrapCall) {
            void logout();
            enqueueSnackbar("Session expired. Please login again.", { variant: "error" });
            navigate("/login");
          } else if (skipErrorToast || isGetCall) {
            // Request will handle its own toast (e.g. parsing blob/json).
          } else if (error.response.data?.message || error.response.data?.msg) {
            enqueueSnackbar(error.response.data?.message ?? error.response.data?.msg, { variant: "error" });
          } else if (typeof error.response.data === "string" && error.response.data.trim()) {
            enqueueSnackbar(error.response.data.trim(), { variant: "error" });
          } else {
            enqueueSnackbar("Something went wrong", { variant: "error" });
          }
        } else {
          if (skipErrorToast) return Promise.reject(error);
          if (isGetCall && !isAuthBootstrapCall) return Promise.reject(error);

          const raw = String(error?.message ?? "").trim();
          const msg =
            isAuthBootstrapCall
              ? "Unable to reach the server. Please try again."
              : raw && raw.toLowerCase() !== "network error"
                ? raw
                : "Network error. Please try again.";

          enqueueSnackbar(msg, { variant: "error" });
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [enqueueSnackbar, logout, navigate]);
}
