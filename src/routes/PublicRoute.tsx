// routes/PublicRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { CommonLoader } from "../components/common/CommonLoader";

const PublicRoute = () => {
  const { isAuthenticated, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return <CommonLoader />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

export default PublicRoute;
