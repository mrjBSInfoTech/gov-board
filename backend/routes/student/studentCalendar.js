import express from "express";
import db from "../../database/db.js";
import { authenticateStudent } from "../../middleware/studentAuthMiddleware.js";
import { getRoomCalendarEventPredicate } from "../../utils/shared/calendarEventScope.js";

const router = express.Router();

router.get("/", authenticateStudent, (req, res) => {
  const roomId = Number(req.query.roomId);
  const studentId = req.user?.student_id;

  if (!Number.isInteger(roomId) || roomId < 1) {
    return res.status(400).json({ message: "A valid roomId is required." });
  }

  db.query(
    `SELECT e.event_id, e.room_id, e.visibility_scope, e.college, e.title,
            e.description, e.start_at, e.end_at, e.reminder_minutes,
            e.created_by, e.date_created, e.date_updated
       FROM room r
       JOIN calendar_event e ON ${getRoomCalendarEventPredicate()}
      WHERE r.room_id = ?
        AND e.start_at >= CURRENT_DATE
        AND EXISTS (
          SELECT 1
            FROM room_member
           WHERE room_id = ?
             AND member_type = 'student'
             AND member_id = ?
        )
      ORDER BY e.start_at ASC, e.event_id ASC`,
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
