import { useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { api } from "../lib/api";

export type LoginFormValues = {
    email: string;
    password: string;
};

export type RegisterFormValues = {
    name: string;
    email: string;
    password: string;
    role: "admin" | "operator";
};

export function useLogin() {
    const { enqueueSnackbar } = useSnackbar();

    return useMutation({
        mutationFn: async (data: LoginFormValues) => {
            const res = await api.post("/api/auth/login", data, {
                withCredentials: true
            }); // login endpoint
            return res.data;
        },
        onError: (error: any) => {
            enqueueSnackbar(error.response?.data?.message || error.message, { variant: "error" });
        },
    });
}

export function useRegisterUser() {
    const { enqueueSnackbar } = useSnackbar();

    return useMutation({
        mutationFn: async (data: RegisterFormValues) => {
            const res = await api.post("/api/auth", data, { withCredentials: true });
            return res.data;
        },
        onSuccess: () => {
            enqueueSnackbar("User created successfully!", { variant: "success" });
        },
        onError: (error: any) => {
            enqueueSnackbar(error.response?.data?.message || error.message, { variant: "error" });
        },
    });
}
