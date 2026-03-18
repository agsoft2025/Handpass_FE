import { useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { api } from "../lib/api";

export type LoginFormValues = {
    email: string;
    password: string;
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
        onSuccess: () => {  
            enqueueSnackbar("Login successful!", { variant: "success" });
        },
        onError: (error: any) => {
            enqueueSnackbar(error.response?.data?.message || error.message, { variant: "error" });
        },
    });
}
