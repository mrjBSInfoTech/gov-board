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
import adminRoomRoutes from "./routes/admin/adminRoom.js";
// Routes (Officer)
import officerAuthenticateRoutes from "./routes/officer/officerAuthentication.js";
// Routes (Student)
import studentAuthenticateRoutes from "./routes/student/studentAuthenticate.js";

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
// Routes (Officer)
app.use("/api/officer/authenticate", officerAuthenticateRoutes);
// Routes (Student)
app.use("/api/student/authenticate", studentAuthenticateRoutes);

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
