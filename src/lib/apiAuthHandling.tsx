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
        if (error.response) {
          const status = error.response.status;
          const requestUrl = String(error.config?.url ?? "");
          const isAuthBootstrapCall = requestUrl.includes("/api/auth/me");

          if ((status === 401 || status === 403) && isAuthBootstrapCall) {
            return Promise.reject(error);
          }

          if ((status === 401 || status === 403) && !isAuthBootstrapCall) {
            void logout();
            enqueueSnackbar("Session expired. Please login again.", { variant: "error" });
            navigate("/login");
          } else if (error.response.data?.message) {
            enqueueSnackbar(error.response.data.message, { variant: "error" });
          } else {
            enqueueSnackbar("Something went wrong", { variant: "error" });
          }
        } else {
          enqueueSnackbar(error.message, { variant: "error" });
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [enqueueSnackbar, logout, navigate]);
}
