import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";
import {
  refreshSession,
} from "../api/student/studentAuthenticationAPI";
import { setToken } from "../../utils/auth";

export default function OfficerRoute() {
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const officerToken = localStorage.getItem("officer_token");

  useEffect(() => {
    if (!officerToken || !isAuthenticated("officer")) {
      setCheckingRole(false);
      return;
    }

    refreshSession(officerToken)
      .then((data) => {
        localStorage.removeItem("officer_token");
        localStorage.removeItem("student_token");
        const authType = data.is_officer ? "officer" : "student";
        setToken(authType, data.token);
        localStorage.setItem(`${authType}_student_id`, data.student_id || "");
        localStorage.setItem(`${authType}_student_number`, data.student_number || "");
        localStorage.setItem(`${authType}_first_name`, data.first_name || "");
        localStorage.setItem(`${authType}_last_name`, data.last_name || "");

        if (!data.is_officer) {
          navigate("/student/home", { replace: true });
        }
      })
      .catch(() => {
        localStorage.removeItem("officer_token");
        navigate("/student/login", { replace: true });
      })
      .finally(() => setCheckingRole(false));
  }, [navigate, officerToken]);

  if (!officerToken || !isAuthenticated("officer")) {
    return <Navigate to="/student/login" replace />;
  }

  if (checkingRole) return null;

  return <Outlet />;
}