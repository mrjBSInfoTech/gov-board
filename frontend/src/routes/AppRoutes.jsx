import { Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

// Layouts
import AdminLayout from "../layouts/AdminLayout";
import OfficerLayout from "../layouts/OfficerLayout";
import StudentLayout from "../layouts/StudentLayout";

//Routes
import AdminRoute from "../middleware/AdminRoute";
import OfficerRoute from "../middleware/OfficerRoute";
import StudentRoute from "../middleware/StudentRoute";

// Admin Pages
import AdminDashboard from "../pages/admin/Dashboard";
import AdminAccount from "../pages/admin/Account";
import AdminRoom from "../pages/admin/Room";
import AdminLogin from "../pages/admin/Login";

// Student Pages
import StudentHome from "../pages/student/Home";
import StudentAnnouncement from "../pages/student/Announcement";
import StudentLogin from "../pages/student/Login";
import StudentRegister from "../pages/student/Register";

// Officer Pages
import OfficerLogin from "../pages/officer/Login";
import OfficerDashboard from "../pages/officer/Dashboard";
import OfficerAnnouncement from "../pages/officer/Announcement";
import OfficerModerate from "../pages/officer/Moderate";
import OfficerAccount from "../pages/officer/Account";

const theme = createTheme();

export default function AppRoutes() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          {/* Student Routes */}
          <Route path="/student">
            <Route path="login" element={<StudentLogin />} />
            <Route path="register" element={<StudentRegister />} />

            {/* Public student pages */}
            <Route element={<StudentLayout />}>
              <Route path="home" element={<StudentHome />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin">
            <Route path="login" element={<AdminLogin />} />

            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="account" element={<AdminAccount />} />
                <Route path="room" element={<AdminRoom />} />
              </Route>
            </Route>
          </Route>

          {/* Officer Routes */}
          <Route path="/officer">
            <Route path="login" element={<OfficerLogin />} />

            <Route element={<OfficerRoute />}>
              <Route element={<OfficerLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<OfficerDashboard />} />
                <Route path="account" element={<OfficerAccount />} />  
                <Route path="announcement" element={<OfficerAnnouncement />} />  
                <Route path="moderate" element={<OfficerModerate />} />
              </Route>  
            </Route>
          </Route>

        </Routes>
      </ThemeProvider>
    </HelmetProvider>
  );
}
