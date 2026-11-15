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
import AdminAccounts from "../pages/admin/Admins";
import AdminStudents from "../pages/admin/Students";
import AdminRoom from "../pages/admin/Room";
import AdminRoomDetails from "../pages/admin/RoomDetails";
import AdminEventHandler from "../pages/admin/EventHandler";
import AdminRoomGovernanceAnnouncement from "../pages/admin/RoomGovernanceAnnouncement";
import AdminAudit from "../pages/admin/Audit";
import AdminSettings from "../pages/admin/Settings";
import AdminLogin from "../pages/admin/Login";

// Student Pages
import StudentHome from "../pages/student/Home";
import StudentAnnouncement from "../pages/student/Announcement";
import StudentAccount from "../pages/student/Account";
import StudentLogin from "../pages/student/Login";
import StudentRegister from "../pages/student/Register";
import Quest from "../pages/Quest";
import RoomMain from "../pages/RoomMain";

// Officer Pages
import OfficerDashboard from "../pages/officer/Dashboard";
import OfficerAnnouncement from "../pages/officer/Announcement";
import OfficerAccount from "../pages/officer/Account";
import OfficerGovernanceSection from "../pages/officer/GovernanceSection";

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
            <Route element={<StudentRoute />}>
              <Route element={<StudentLayout />}>
                <Route path="home" element={<StudentHome />} />
                <Route path="account" element={<StudentAccount />} />
                <Route
                  path="quest"
                  element={<Navigate to="/student/rooms/main" replace />}
                />
                <Route path="rooms/main" element={<RoomMain role="student" />} />
                <Route
                  path="rooms/:roomId/hub"
                  element={<StudentAnnouncement />}
                />
                <Route path="rooms/:roomId/quests" element={<Quest />} />
                <Route
                  path="announcement"
                  element={<Navigate to="/student/rooms/main" replace />}
                />
              </Route>
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin">
            <Route path="login" element={<AdminLogin />} />

            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route
                  path="account"
                  element={<Navigate to="admins" replace />}
                />
                <Route path="account/admins" element={<AdminAccounts />} />
                <Route path="account/students" element={<AdminStudents />} />
                <Route
                  path="account/officials"
                  element={<Navigate to="/admin/account/students" replace />}
                />
                <Route path="rooms" element={<Navigate to="main" replace />} />
                <Route path="rooms/main" element={<AdminRoom />} />
                <Route
                  path="rooms/:roomId/hub"
                  element={<AdminRoomDetails />}
                />
                <Route
                  path="rooms/:roomId/governance/announcement"
                  element={<AdminRoomGovernanceAnnouncement />}
                />
                <Route
                  path="rooms/:roomId/governance/event-scheduler"
                  element={<AdminEventHandler />}
                />
                <Route
                  path="governance/announcement"
                  element={<AdminRoomGovernanceAnnouncement />}
                />
                <Route
                  path="governance/event-scheduler"
                  element={<AdminEventHandler />}
                />
                <Route path="room" element={<Navigate to="/admin/rooms/main" replace />} />
                <Route path="room/main" element={<Navigate to="/admin/rooms/main" replace />} />
                <Route
                  path="room/:roomId"
                  element={<Navigate to="/admin/rooms/main" replace />}
                />
                <Route
                  path="room/governance/announcement"
                  element={<Navigate to="/admin/rooms/main" replace />}
                />
                <Route
                  path="room/governance/event-handlers"
                  element={<Navigate to="/admin/rooms/main" replace />}
                />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="audit" element={<AdminAudit />} />
              </Route>
            </Route>
          </Route>

          {/* Officer Routes */}
          <Route path="/officer">
            <Route element={<OfficerRoute />}>
              <Route element={<OfficerLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<OfficerDashboard />} />
                <Route path="account" element={<OfficerAccount />} />
                <Route
                  path="quest"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="audit"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route path="rooms/main" element={<RoomMain role="officer" />} />
                <Route
                  path="rooms/:roomId/hub"
                  element={<OfficerAnnouncement />}
                />
                <Route path="rooms/:roomId/quests" element={<Quest />} />
                <Route
                  path="rooms/:roomId/governance/:section"
                  element={<OfficerGovernanceSection />}
                />
                <Route
                  path="room"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="room/announcement"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="room/governance/:section"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="announcement"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="announcement/overview"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="announcement/:section"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="moderate"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="governance/:section"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
                <Route
                  path="governance/moderate"
                  element={<Navigate to="/officer/rooms/main" replace />}
                />
              </Route>
            </Route>
          </Route>
        </Routes>
      </ThemeProvider>
    </HelmetProvider>
  );
}
