import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { CommonLoader } from "../components/common/CommonLoader";

const ProtectedRoute = () => {
    const { isAuthenticated, isCheckingAuth } = useAuth();

    if (isCheckingAuth) {
        return <CommonLoader />;
    }

  return (
    isAuthenticated ? <Outlet /> : <Navigate to={"/login"} replace />
  );
};

export default ProtectedRoute;
