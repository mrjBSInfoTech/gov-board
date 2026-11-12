import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";
import { requireOfficerGovernanceAccess } from "../../middleware/officerGovernanceAccess.js";
import { logOfficerAudit } from "../../utils/officer/officerAuditLogger.js";

const router = express.Router();
router.use(authenticateOfficer);

router.get("/", requireOfficerGovernanceAccess({ section: "audit" }), async (req, res) => {
  try {
    const connection = db.promise();
    const roomId = req.governanceRoomId;

  const { search = "", date = "", period = "all" } = req.query;
  let sql = `SELECT a.audit_id, a.datetime, a.action, a.actor,
                    a.role, a.status, a.information
    FROM audit_logs a
    WHERE a.room_id = ? AND a.role IN ('Student', 'Officer')`;
  const params = [roomId];
  if (search) {
    sql += ` AND (a.action LIKE ? OR a.actor LIKE ? OR a.role LIKE ?
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
    const [results] = await connection.query(sql, params);
    res.json(results);
  } catch (error) {
    console.error("Room audit lookup error:", error);
    res.status(500).json({ message: "Unable to load room audit logs." });
  }
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
