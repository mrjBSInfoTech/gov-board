import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
// Routes (Admin)
import adminAuthenticateRoutes from "./routes/admin/adminAuthentication.js";
import adminAccountRoutes from "./routes/admin/adminAccount.js";
import adminAuditRoutes from "./routes/admin/adminAudit.js";
import adminRoomRoutes from "./routes/admin/adminRoom.js";
import adminStudentRoutes from "./routes/admin/adminStudent.js";
// Routes (Officer)
import officerAuthenticateRoutes from "./routes/officer/officerAuthentication.js";
import officerDashboardRoutes from "./routes/officer/officerDashboard.js";
import officerAnnouncementRoutes from "./routes/officer/officerAnnouncement.js";
import officerModerateRoutes from "./routes/officer/officerModerate.js";
import officerBudgetRoutes from "./routes/officer/officerBudget.js";
import officerFundRoutes from "./routes/officer/officerFund.js";
import officerMemberRoutes from "./routes/officer/officerMember.js";
import officerCalendarRoutes from "./routes/officer/officerCalendar.js";
import officerAuditRoutes from "./routes/officer/officerAudit.js";
import { auditOfficerActivity } from "./utils/officer/officerAuditLogger.js";
import { auditStudentActivity } from "./utils/student/studentActivityLogger.js";
import roomRoutes from "./routes/room.js";
import roomLevelRoutes from "./routes/roomLevel.js";
// Routes (Student)
import studentAuthenticateRoutes from "./routes/student/studentAuthenticate.js";
import studentAnnouncementRoutes from "./routes/student/studentAnnouncement.js";
import studentAuditRoutes from "./routes/student/studentAudit.js";
import studentCalendarRoutes from "./routes/student/studentCalendar.js";

dotenv.config();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with absolute path
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root route (just to test if server runs)
app.get("/", (req, res) => {
  res.send("Art Match API is running ✅");
});

// Routes (Admin)
app.use("/api/admin/authenticate", adminAuthenticateRoutes);
app.use("/api/admin/accounts", adminAccountRoutes);
app.use("/api/admin/rooms", adminRoomRoutes);
app.use("/api/admin/students", adminStudentRoutes);
app.use("/api/admin/audit", adminAuditRoutes);
// Routes (Officer)
app.use("/api/officer", auditOfficerActivity);
app.use("/api/officer/audit", officerAuditRoutes);
app.use("/api/officer/authenticate", officerAuthenticateRoutes);
app.use("/api/officer/dashboard", officerDashboardRoutes);
app.use("/api/officer/announcements", officerAnnouncementRoutes);
app.use("/api/officer/moderate", officerModerateRoutes);
app.use("/api/officer/budget", officerBudgetRoutes);
app.use("/api/officer/fund", officerFundRoutes);
app.use("/api/officer/members", officerMemberRoutes);
app.use("/api/officer/calendar", officerCalendarRoutes);
app.use("/api/rooms", auditStudentActivity, auditOfficerActivity, roomRoutes);
app.use("/api/rooms", roomLevelRoutes);
// Routes (Student)
app.use("/api/student", auditStudentActivity);
app.use("/api/student/authenticate", studentAuthenticateRoutes);
app.use("/api/student/announcements", studentAnnouncementRoutes);
app.use("/api/student/calendar", studentCalendarRoutes);
app.use("/api/student/audit", studentAuditRoutes);

// Handle 404 (unknown routes)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
