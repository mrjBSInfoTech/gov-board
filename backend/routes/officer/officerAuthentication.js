import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// Replaced db with supabase
import supabase from "../../config/supabase.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();

// LOGIN 
router.post("/login", async (req, res) => {
  const { student_number, password } = req.body;

  if (!student_number || !password) {
    return res.status(400).json({ message: "Student number and password are required" });
  }

  try {
    const { data: result, error } = await supabase
      .from("officer")
      .select(`
        officer_id, student_number, first_name, last_name, password,
        officer_role (role, can_add, can_edit, can_delete, can_moderate)
      `)
      .eq("student_number", student_number.trim())
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    if (!result) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    // Flatten joined data
    const roleData = result.officer_role && result.officer_role.length > 0 
      ? result.officer_role[0] 
      : (result.officer_role || {});
      
    const officer = {
      ...result,
      role: roleData.role || "officer",
      can_add: roleData.can_add || 0,
      can_edit: roleData.can_edit || 0,
      can_delete: roleData.can_delete || 0,
      can_moderate: roleData.can_moderate || 0,
    };

    const isMatch = bcrypt.compareSync(password, officer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const token = jwt.sign(
      {
        officer_id: officer.officer_id,
        student_number: officer.student_number,
        role: officer.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      officer_id: officer.officer_id,
      student_number: officer.student_number,
      first_name: officer.first_name,
      last_name: officer.last_name,
      role: officer.role,
      can_add: officer.can_add,
      can_edit: officer.can_edit,
      can_delete: officer.can_delete,
      can_moderate: officer.can_moderate,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

// Backup Code
{/*
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();

// Get absolute path for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "seller",
  "uploadCOR",
);

// ✅ Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const fileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${Date.now()}-${fileName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

const profileUploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "officer",
  "uploadOfficer",
);
if (!fs.existsSync(profileUploadDir))
  fs.mkdirSync(profileUploadDir, { recursive: true });
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: profileUploadDir,
    filename: (req, file, cb) =>
      cb(
        null,
        `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      ),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// ─── OFFICER LOGIN ─────────────────
router.post("/login", (req, res) => {
  const { student_number, password } = req.body;

  if (!student_number || !password) {
    return res.status(400).json({ message: "Student number and password are required" });
  }

  const sql = `
    SELECT
      o.officer_id,
      o.student_number,
      o.first_name,
      o.last_name,
      o.password,
      r.role,
      r.can_add,
      r.can_edit,
      r.can_delete,
      r.can_moderate
    FROM officer o
    LEFT JOIN officer_role r ON o.officer_id = r.officer_id
    WHERE o.student_number = ?
    LIMIT 1`;

  db.query(sql, [student_number.trim()], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const officer = results[0];

    const isMatch = bcrypt.compareSync(password, officer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const token = jwt.sign(
      {
        officer_id: officer.officer_id,
        student_number: officer.student_number,
        role: officer.role || "officer",
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      officer_id: officer.officer_id,
      student_number: officer.student_number,
      first_name: officer.first_name,
      last_name: officer.last_name,
      role: officer.role || "officer",
      can_add: officer.can_add,
      can_edit: officer.can_edit,
      can_delete: officer.can_delete,
      can_moderate: officer.can_moderate,
    });
  });
});

export default router;
*/}