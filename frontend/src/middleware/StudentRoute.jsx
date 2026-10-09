import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";
import {
  refreshSession,
} from "../api/student/studentAuthenticationAPI";
import { setToken } from "../../utils/auth";

export default function StudentRoute() {
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const studentToken = localStorage.getItem("student_token");

  useEffect(() => {
    if (!studentToken || !isAuthenticated("student")) {
      setCheckingRole(false);
      return;
    }

    refreshSession(studentToken)
      .then((data) => {
        localStorage.removeItem("student_token");
        localStorage.removeItem("officer_token");
        const authType = data.is_officer ? "officer" : "student";
        setToken(authType, data.token);
        localStorage.setItem(`${authType}_student_id`, data.student_id || "");
        localStorage.setItem(`${authType}_student_number`, data.student_number || "");
        localStorage.setItem(`${authType}_first_name`, data.first_name || "");
        localStorage.setItem(`${authType}_last_name`, data.last_name || "");

        if (data.is_officer) {
          localStorage.setItem("officer_officer_id", data.officer_id || "");
          localStorage.setItem("officer_position", data.position || "Officer");
          navigate("/officer/dashboard", { replace: true });
        }
      })
      .catch(() => {
        localStorage.removeItem("student_token");
        navigate("/student/login", { replace: true });
      })
      .finally(() => setCheckingRole(false));
  }, [navigate, studentToken]);

  if (!studentToken || !isAuthenticated("student")) {
    return <Navigate to="/student/login" replace />;
  }

  if (checkingRole) return null;

  return <Outlet />;
}