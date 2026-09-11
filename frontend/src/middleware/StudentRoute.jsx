import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";

export default function StudentRoute() {
  if (!isAuthenticated("student")) {
    return <Navigate to="/student/login" replace />;
  }

  return <Outlet />;
}