import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();
const MODERATE_POSITIONS = new Set([
  "mayor",
  "vice-mayor",
  "vice mayor",
  "secretary",
  "protocol officer",
]);

router.get("/same-section", authenticateOfficer, async (req, res) => {
  const officerId = Number(req.user?.officer_id);
  const roomId = Number(req.query.roomId);
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ message: "A valid roomId is required." });
  }

  try {
    const connection = db.promise();
    const [moderators] = await connection.query(
      `SELECT rm.position, b.year_name AS year, b.section_name AS section
         FROM room_member rm
         INNER JOIN student s ON s.student_id = rm.member_id
         LEFT JOIN batch b ON b.batch_id = s.batch_id
        WHERE rm.room_id = ? AND rm.member_id = ?
          AND rm.member_type = 'officer'
        LIMIT 1`,
      [roomId, officerId],
    );
    if (!moderators.length) {
      return res.status(403).json({ message: "You are not an officer in this room." });
    }

    const position = String(moderators[0].position || "")
      .trim()
      .toLowerCase()
      .replace(/\./g, "");
    if (!MODERATE_POSITIONS.has(position)) {
      return res.status(403).json({
        message: "Only leadership and Protocol Officers can access moderation.",
      });
    }

    const year = String(moderators[0].year || "").trim();
    const section = String(moderators[0].section || "").trim();
    const hasBatch = Boolean(year && section);
    const [members] = await connection.query(
      `SELECT s.student_id AS id, s.first_name, s.last_name,
              s.student_number, rm.position, b.year_name AS year,
              b.section_name AS section, rm.member_type
         FROM room_member rm
         INNER JOIN student s ON s.student_id = rm.member_id
         LEFT JOIN batch b ON b.batch_id = s.batch_id
        WHERE rm.room_id = ?
          ${hasBatch ? "AND b.year_name = ? AND b.section_name = ?" : ""}
        ORDER BY rm.member_type ASC, s.first_name ASC, s.last_name ASC`,
      hasBatch ? [roomId, year, section] : [roomId],
    );
    res.json(
      members.map((member) => ({
        ...member,
        member_type: member.member_type === "officer" ? "Officer" : "Student",
      })),
    );
  } catch (error) {
    console.error("Moderator list error:", error);
    res.status(500).json({ message: "Unable to load room members." });
  }
});

export default router;
