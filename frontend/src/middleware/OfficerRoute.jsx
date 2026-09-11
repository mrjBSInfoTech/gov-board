import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";

export default function OfficerRoute() {
  if (!isAuthenticated("officer")) {
    return <Navigate to="/officer/login" replace />;
  }

  return <Outlet />;
}