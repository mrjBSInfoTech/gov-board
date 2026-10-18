import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";
import { logOfficerAudit } from "../../utils/officer/officerAuditLogger.js";

const router = express.Router();
router.use(authenticateOfficer);

router.get("/", (req, res) => {
  const { search = "", date = "", period = "all" } = req.query;
  // Look up the officer's current batch; never trust a client-supplied section.
  let sql = `SELECT a.audit_id, a.datetime, a.action, subject.student_number AS actor, a.role, a.status, a.information
    FROM audit_logs a
    INNER JOIN student subject ON
      a.role IN ('Student', 'Officer') AND (
        BINARY a.actor = BINARY subject.student_number
        OR (a.role = 'Student' AND BINARY a.actor = BINARY CONCAT('Student ', subject.student_id))
        OR (a.role = 'Officer' AND BINARY a.actor = BINARY CONCAT('Officer ', subject.student_id))
      )
    INNER JOIN student viewer ON viewer.student_id = ? AND viewer.role IS NOT NULL
      AND viewer.batch_id = subject.batch_id
    WHERE viewer.batch_id IS NOT NULL`;
  const params = [req.user.officer_id];
  if (search) {
    sql += ` AND (a.action LIKE ? OR subject.student_number LIKE ? OR a.role LIKE ?
      OR a.status LIKE ? OR a.information LIKE ?)`;
    params.push(...Array(5).fill(`%${search}%`));
  }
  if (date) {
    sql += " AND DATE(a.datetime) = ?";
    params.push(date);
  }
  const intervals = {
    hour: "1 HOUR", day: "1 DAY", week: "1 WEEK", month: "1 MONTH", year: "1 YEAR",
  };
  if (Object.hasOwn(intervals, period)) {
    sql += ` AND a.datetime >= DATE_SUB(NOW(), INTERVAL ${intervals[period]})`;
  }
  sql += " ORDER BY a.datetime DESC, a.audit_id DESC";
  db.query(sql, params, (error, results) => {
    if (error) return res.status(500).json({ message: "Unable to load section audit logs." });
    res.json(results);
  });
});

router.post("/", async (req, res) => {
  if (req.body.action !== "Logout") return res.status(400).json({ message: "Unsupported audit action" });
  const saved = await logOfficerAudit(req.user.officer_id, {
    action: "Logout", status: "Success",
  });
  if (!saved) return res.status(500).json({ message: "Unable to record logout" });
  res.status(201).json({ message: "Logout recorded" });
});

export default router;
