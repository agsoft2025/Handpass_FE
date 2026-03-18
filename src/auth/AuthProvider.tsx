import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";

interface IAuthContext {
    isAuthenticated: boolean;
    isCheckingAuth: boolean;
    user: unknown;
    login: (user?: unknown) => void;
    logout: () => Promise<void>;
    refreshAuth: () => Promise<void>;
}

interface IAuthProvider {
    children: ReactNode
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const AuthProvider = ({ children }: IAuthProvider) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [user, setUser] = useState<unknown>(null);

    const login = (loggedInUser?: unknown) => {
        setIsAuthenticated(true);
        if (typeof loggedInUser !== "undefined") {
            setUser(loggedInUser);
        }
    };

    const logout = async () => {
        try {
            await api.get("/api/auth/logout");
        } catch {
            // Clear local auth state even if server logout fails.
        } finally {
            setIsAuthenticated(false);
            setUser(null);
        }
    };

    const refreshAuth = useCallback(async () => {
        setIsCheckingAuth(true);
        try {
            const res = await api.get("/api/auth/me");
            setIsAuthenticated(true);
            setUser(res.data?.data ?? res.data?.user ?? res.data ?? null);
        } catch {
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setIsCheckingAuth(false);
        }
    }, []);

    useEffect(() => {
        refreshAuth();
    }, [refreshAuth]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, isCheckingAuth, user, login, logout, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): IAuthContext => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
};
