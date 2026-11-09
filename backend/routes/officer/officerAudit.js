import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";
import { logOfficerAudit } from "../../utils/officer/officerAuditLogger.js";

const router = express.Router();
router.use(authenticateOfficer);

router.get("/", async (req, res) => {
  const roomId = Number(req.query.roomId);
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ message: "A valid roomId is required." });
  }

  try {
    const connection = db.promise();
    const [memberships] = await connection.query(
      `SELECT position FROM room_member
        WHERE room_id = ? AND member_id = ? AND member_type = 'officer'
        LIMIT 1`,
      [roomId, req.user.officer_id],
    );
    if (!memberships.length) {
      return res.status(403).json({ message: "You are not an officer in this room." });
    }

    const position = String(memberships[0].position || "")
      .trim()
      .toLowerCase()
      .replace(/\./g, "");
    if (!["mayor", "vice-mayor", "vice mayor", "secretary", "auditor", "protocol officer"].includes(position)) {
      return res.status(403).json({ message: "Your room position cannot access audit records." });
    }

  const { search = "", date = "", period = "all" } = req.query;
  let sql = `SELECT a.audit_id, a.datetime, a.action, subject.student_number AS actor,
                    a.role, a.status, a.information
    FROM audit_logs a
    INNER JOIN student subject ON
      a.role IN ('Student', 'Officer') AND (
        BINARY a.actor = BINARY subject.student_number
        OR (a.role = 'Student' AND BINARY a.actor = BINARY CONCAT('Student ', subject.student_id))
        OR (a.role = 'Officer' AND BINARY a.actor = BINARY CONCAT('Officer ', subject.student_id))
      )
    INNER JOIN room_member rm ON rm.room_id = a.room_id
      AND rm.member_id = subject.student_id
    WHERE a.room_id = ? AND a.role IN ('Student', 'Officer')`;
  const params = [roomId];
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
