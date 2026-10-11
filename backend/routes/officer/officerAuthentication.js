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

router.get("/account", authenticateOfficer, (req, res) => {
  db.query(
    "SELECT first_name, last_name, student_number FROM student WHERE student_id = ? AND role IS NOT NULL LIMIT 1",
    [req.user.officer_id],
    (err, rows) => {
      if (err) {
        console.error("Officer account read error:", err);
        return res.status(500).json({ message: "Unable to load account." });
      }
      if (!rows.length) return res.status(404).json({ message: "Account not found." });
      res.json(rows[0]);
    },
  );
});

router.put("/account", authenticateOfficer, (req, res) => {
  const firstName = req.body.first_name?.trim();
  const lastName = req.body.last_name?.trim();
  const studentNumber = req.body.student_number?.trim();
  if (!firstName || !lastName || !studentNumber) {
    return res.status(400).json({ message: "First name, last name, and student number are required." });
  }
  db.query(
    `UPDATE student SET first_name = ?, last_name = ?, student_number = ?
     WHERE student_id = ? AND role IS NOT NULL`,
    [firstName, lastName, studentNumber, req.user.officer_id],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Student number already exists." });
        console.error("Officer account update error:", err);
        return res.status(500).json({ message: "Unable to update account." });
      }
      res.json({ first_name: firstName, last_name: lastName, student_number: studentNumber });
    },
  );
});

router.put("/account/password", authenticateOfficer, (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "Current password and a new password of at least 8 characters are required." });
  }
  db.query("SELECT password FROM student WHERE student_id = ? AND role IS NOT NULL LIMIT 1", [req.user.officer_id], (err, rows) => {
    if (err) {
      console.error("Officer password lookup error:", err);
      return res.status(500).json({ message: "Unable to change password." });
    }
    if (!rows.length || !bcrypt.compareSync(currentPassword, rows[0].password)) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    db.query("UPDATE student SET password = ? WHERE student_id = ?", [bcrypt.hashSync(newPassword, 10), req.user.officer_id], (updateErr) => {
      if (updateErr) {
        console.error("Officer password update error:", updateErr);
        return res.status(500).json({ message: "Unable to change password." });
      }
      res.json({ message: "Password changed successfully." });
    });
  });
});

// LOGIN
router.post("/login", async (req, res) => {
  const { student_number, password } = req.body;

  if (!student_number || !password) {
    return res
      .status(400)
      .json({ message: "Student number and password are required" });
  }

  const sql = `
    SELECT s.student_id AS officer_id, s.student_number, s.position,
      b.year_name AS year,
      b.section_name AS section,
      s.first_name, s.last_name, s.password,
      s.role, s.can_add, s.can_edit, s.can_delete, s.can_moderate
    FROM student s
    LEFT JOIN batch b ON b.batch_id = s.batch_id
    WHERE s.student_number = ? AND s.role IS NOT NULL
    LIMIT 1`;

  db.query(sql, [student_number.trim()], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const officer = results[0];
    if (!officer) {
      return res
        .status(401)
        .json({ message: "Invalid student number or password" });
    }

    officer.role = officer.role || "officer";
    officer.can_add = officer.can_add || 0;
    officer.can_edit = officer.can_edit || 0;
    officer.can_delete = officer.can_delete || 0;
    officer.can_moderate = officer.can_moderate || 0;

    const isMatch = bcrypt.compareSync(password, officer.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Invalid student number or password" });
    }

    const resolvedSection = officer.section || "";
    const resolvedYear = officer.year || null;

    const token = jwt.sign(
      {
        officer_id: officer.officer_id,
        student_number: officer.student_number,
        role: officer.role,
        section: resolvedSection,
        year: resolvedYear,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      officer_id: officer.officer_id,
      student_number: officer.student_number,
      position: officer.position || "Officer",
      year: resolvedYear,
      section: resolvedSection,
      first_name: officer.first_name,
      last_name: officer.last_name,
      role: officer.role,
      can_add: officer.can_add,
      can_edit: officer.can_edit,
      can_delete: officer.can_delete,
      can_moderate: officer.can_moderate,
    });
  });
});

export default router;

// Backup Code
{
  /*
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
*/
}
