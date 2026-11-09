import jwt from "jsonwebtoken";
import db from "../database/db.js";
import { PRIMARY_ADMIN_ID } from "../utils/shared/adminScope.js";

export const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!authHeader) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  if (!token) {
    return res.status(401).json({
      message: "Invalid token format.",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid or expired token.",
      });
    }

    if (user.student_id || user.officer_id || user.student_number) {
      return res.status(403).json({
        message: "An admin session is required.",
      });
    }

    const adminId = user.admin_id || user.id;

    if (!adminId) {
      return res.status(403).json({
        message: "Unable to identify admin.",
      });
    }

    db.query(
      "SELECT admin_id, username, position, college, can_edit_students FROM admin WHERE admin_id = ? LIMIT 1",
      [adminId],
      (dbError, rows) => {
        if (dbError) {
          console.error("Admin account lookup error:", dbError);
          return res.status(500).json({ message: "Unable to verify admin account." });
        }
        if (!rows.length) {
          return res.status(403).json({ message: "Admin account not found." });
        }

        const admin = rows[0];
        const isPrimaryAdmin = Number(admin.admin_id) === PRIMARY_ADMIN_ID;
        const isSuperAdmin = isPrimaryAdmin && admin.position === "Super Admin";
        if (
          admin.position === "Super Admin" &&
          !isPrimaryAdmin
        ) {
          return res.status(403).json({
            message: "Only the primary admin can be a Super Admin.",
          });
        }
        if (
          !isSuperAdmin &&
          !["Governor", "College Head"].includes(admin.position)
        ) {
          return res.status(403).json({
            message: "This admin account has an invalid position.",
          });
        }
        if (!isSuperAdmin && !admin.college?.trim()) {
          return res.status(403).json({
            message: "This admin account is not assigned to a college.",
          });
        }

        req.user = {
          ...user,
          admin_id: admin.admin_id,
          username: admin.username,
          position: admin.position,
          college: admin.college,
          can_edit_students: Boolean(admin.can_edit_students),
          is_super_admin: isSuperAdmin,
        };
        next();
      },
    );
  });
};