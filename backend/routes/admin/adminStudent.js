import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT student_id, first_name, last_name, student_number, position, year, section, date_created
    FROM student
    ORDER BY date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(result);
  });
});

export default router;
