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

router.delete("/:id", authenticateAdmin, (req, res) => {
  const student_id = req.params.id;
  const sql = `DELETE FROM student WHERE student_id = ?`;

  db.query(sql, [student_id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  });
});

export default router;
