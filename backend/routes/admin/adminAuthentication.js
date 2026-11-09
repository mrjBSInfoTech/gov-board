import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import { logAudit } from "../../utils/shared/auditLogger.js";
import { PRIMARY_ADMIN_ID } from "../../utils/shared/adminScope.js";

const router = express.Router();

// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    void logAudit({
      action: "Login", actor: username || "Unknown admin", role: "Admin",
      status: "Failed", information: "Username and password are required",
    });
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  const sql = `
    SELECT admin_id, username, password, first_name, last_name, position, college,
      can_edit_students
    FROM admin
    WHERE username = ?
    LIMIT 1`;

  db.query(sql, [username.trim()], (err, results) => {
    if (err) {
      void logAudit({
        action: "Login", actor: username, role: "Admin", status: "Failed",
        information: "Database error while checking login credentials",
      });
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const user = results.length > 0 ? results[0] : null;

    if (!user) {
      logAudit({
        action: "Login",
        actor: username,
        role: "Admin",
        status: "Failed",
        information: "Invalid username",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      logAudit({
        action: "Login",
        actor: username,
        role: "Admin",
        status: "Failed",
        information: "Invalid password",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (
      user.position === "Super Admin" &&
      Number(user.admin_id) !== PRIMARY_ADMIN_ID
    ) {
      return res.status(403).json({
        message: "Only the primary admin can be a Super Admin.",
      });
    }
    if (
      !["Governor", "College Head", "Super Admin"].includes(user.position) ||
      (user.position !== "Super Admin" && !user.college?.trim())
    ) {
      return res.status(403).json({
        message: "Admin account needs a valid position and college assignment.",
      });
    }

    const token = jwt.sign(
      {
        id: user.admin_id,
        admin_id: user.admin_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        position: user.position,
        college: user.college,
        can_edit_students: Boolean(user.can_edit_students),
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" },
    );

    logAudit({
      action: "Login",
      actor: user.username,
      status: "Success",
      information: "Admin logged in",
    });

    res.json({
      token,
      admin_id: user.admin_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      position: user.position,
      college: user.college,
      can_edit_students: Boolean(user.can_edit_students),
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

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  const { first_name, password } = req.body;

  if (!first_name || !password) {
    return res
      .status(400)
      .json({ message: "First name and password are required" });
  }

  const sql = `
    SELECT admin_id, password, first_name, last_name
    FROM admin
    WHERE first_name = ?`;

  db.query(sql, [first_name], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.admin_id,
        admin_id: user.admin_id,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" },
    );

    res.json({
      token,
      admin_id: user.admin_id,
      first_name: user.first_name,
      last_name: user.last_name,
    });
  });
});

export default router;
*/
}
