import express from "express";
import db from "../../database/db.js";
import { authenticateStudent } from "../../middleware/studentAuthMiddleware.js";
import { getRoomCollegeMemberVisibilityPredicate } from "../../utils/shared/calendarEventScope.js";

const router = express.Router();

router.delete("/room", authenticateStudent, (req, res) => {
  const studentId = req.user.student_id;
  const roomId = Number(req.body?.roomId);
  if (!studentId) {
    return res.status(403).json({ error: "Unable to identify student" });
  }
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ error: "A valid room is required." });
  }

  db.query(
    "DELETE FROM room_member WHERE room_id = ? AND member_id = ?",
    [roomId, studentId],
    (err, result) => {
      if (err) {
        console.error("Student leave room error:", err);
        return res.status(500).json({ error: "Unable to leave room" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Room membership not found" });
      }
      res.json({ message: "You left the room." });
    },
  );
});

// GET all announcements for a room
router.get("/", authenticateStudent, (req, res) => {
  const roomId = Number(req.query.roomId);

  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ error: "roomId is required" });
  }

  db.query(
    `SELECT room_id FROM room_member
      WHERE room_id = ? AND member_id = ? AND member_type = 'student'
      LIMIT 1`,
    [roomId, req.user.student_id],
    (membershipError, memberships) => {
      if (membershipError) {
        console.error("Student room membership lookup error:", membershipError);
        return res.status(500).json({ error: "Unable to verify room membership." });
      }
      if (!memberships.length) {
        return res.status(403).json({ error: "You are not a student member of this room." });
      }

      db.query(
        `SELECT announcement_id, room_id, announcement_body, link, image, images, date_created,
                'room' AS source_type
           FROM announcement
          WHERE room_id = ?
         UNION ALL
         SELECT CONCAT('governance-', ga.announcement_id) AS announcement_id,
                ?, ga.announcement_body, ga.link, NULL AS image, ga.images,
                ga.date_created, 'governance' AS source_type
           FROM governance_announcement ga
           JOIN room r ON r.room_id = ?
           JOIN student s ON s.student_id = ?
          WHERE ga.visibility_scope = 'global'
             OR (
               ga.visibility_scope = 'college'
               AND ${getRoomCollegeMemberVisibilityPredicate("ga.college")}
             )
          ORDER BY date_created DESC, announcement_id DESC`,
        [roomId, roomId, roomId, req.user.student_id],
        (err, results) => {
          if (err) {
            console.error("Student announcements query error:", err);
            return res.status(500).json({ error: "Unable to load announcements." });
          }
          res.json(results);
        },
      );
    },
  );
});

export default router;
