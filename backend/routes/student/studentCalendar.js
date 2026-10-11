import express from "express";
import db from "../../database/db.js";
import { authenticateStudent } from "../../middleware/studentAuthMiddleware.js";

const router = express.Router();

router.get("/", authenticateStudent, (req, res) => {
  const roomId = Number(req.query.roomId);
  const studentId = req.user?.student_id;

  if (!Number.isInteger(roomId) || roomId < 1) {
    return res.status(400).json({ message: "A valid roomId is required." });
  }

  db.query(
    `SELECT event_id, room_id, title, description, start_at, end_at, reminder_minutes,
            created_by, date_created, date_updated
       FROM calendar_event
      WHERE room_id = ?
        AND EXISTS (
          SELECT 1
            FROM room_member
           WHERE room_id = ?
             AND member_type = 'student'
             AND member_id = ?
        )
      ORDER BY start_at ASC, event_id ASC`,
    [roomId, roomId, studentId],
    (err, results) => {
      if (err) {
        console.error("Student calendar events query error:", err);
        return res.status(500).json({ message: "Unable to load calendar events." });
      }
      res.json(results);
    },
  );
});

export default router;
