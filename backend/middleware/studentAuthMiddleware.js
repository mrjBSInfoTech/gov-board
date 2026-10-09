import jwt from "jsonwebtoken";
import db from "../database/db.js";

export const authenticateStudent = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }
  if (!token) {
    return res.status(401).json({ message: "Invalid token format." });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your_secret_key",
    (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
      }

      const studentId = user.student_id || user.id;
      if (!studentId) {
        return res.status(403).json({ message: "Unable to identify student." });
      }

      db.query(
        "SELECT role FROM student WHERE student_id = ? LIMIT 1",
        [studentId],
        (dbErr, rows) => {
          if (dbErr) {
            console.error("Student role verification error:", dbErr);
            return res.status(500).json({ message: "Unable to verify account role." });
          }

          if (rows.length === 0) {
            return res.status(401).json({ message: "Student account not found." });
          }

          if (rows[0].role) {
            return res.status(403).json({
              message: "This account is now an officer. Please use the officer panel.",
              roleChanged: true,
            });
          }

          req.user = { ...user, student_id: studentId };
          next();
        },
      );
    },
  );
};
