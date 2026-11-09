import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { clearAuthData, isAuthenticated, setToken } from "../../utils/auth";
import { refreshSession } from "../api/student/studentAuthenticationAPI";

export default function OfficerRoute() {
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const officerToken = localStorage.getItem("officer_token");

  useEffect(() => {
    if (!officerToken || !isAuthenticated("officer")) {
      setCheckingRole(false);
      return;
    }

    let active = true;
    let requestInProgress = false;
    let initialCheck = true;

    const verifyOfficerRole = async () => {
      if (requestInProgress) return;
      requestInProgress = true;
      try {
        const token = localStorage.getItem("officer_token");
        if (!token || !isAuthenticated("officer")) return;
        const data = await refreshSession(token);
        if (!active) return;

        const authType = data.is_officer ? "officer" : "student";
        if (data.is_officer) {
          localStorage.removeItem("student_token");
        } else {
          clearAuthData("officer");
          localStorage.removeItem("student_token");
          localStorage.removeItem("joinedRoom");
        }
        setToken(authType, data.token);
        localStorage.setItem(`${authType}_student_id`, data.student_id || "");
        localStorage.setItem(
          `${authType}_student_number`,
          data.student_number || "",
        );
        localStorage.setItem(`${authType}_first_name`, data.first_name || "");
        localStorage.setItem(`${authType}_last_name`, data.last_name || "");

        if (data.is_officer) {
          localStorage.setItem("officer_officer_id", data.officer_id || "");
          localStorage.setItem("officer_position", data.position || "Officer");
          localStorage.setItem("officer_section", data.section || "");
        } else {
          navigate("/student/home", { replace: true });
        }
      } catch (error) {
        if (!active) return;
        if ([401, 403].includes(error.response?.status)) {
          clearAuthData("officer");
          localStorage.removeItem("joinedRoom");
          navigate("/student/login", { replace: true });
        } else {
          console.error("Unable to refresh officer session:", error);
        }
      } finally {
        requestInProgress = false;
        if (initialCheck && active) {
          initialCheck = false;
          setCheckingRole(false);
        }
      }
    };

    void verifyOfficerRole();
    const intervalId = window.setInterval(verifyOfficerRole, 30000);
    window.addEventListener("focus", verifyOfficerRole);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", verifyOfficerRole);
    };
  }, [navigate, officerToken]);

  if (!officerToken || !isAuthenticated("officer")) {
    return <Navigate to="/student/login" replace />;
  }

  if (checkingRole) return null;

  return <Outlet />;
}