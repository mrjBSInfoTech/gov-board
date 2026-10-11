import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const getOfficerId = (req) => req.user?.officer_id || req.user?.id;

const getOfficerRoomId = (req, requestedRoomId, callback) => {
  const roomId = requestedRoomId ? Number(requestedRoomId) : null;
  if (roomId !== null && (!Number.isInteger(roomId) || roomId < 1)) {
    callback(null, false);
    return;
  }
  db.query(
    `SELECT room_id FROM room_member
      WHERE member_type = 'officer' AND member_id = ?
        AND (? IS NULL OR room_id = ?)
      ORDER BY room_id LIMIT 1`,
    [getOfficerId(req), roomId, roomId],
    (err, rows) => {
      if (err) {
        console.error("Officer calendar room lookup error:", err);
        callback(err);
        return;
      }
      callback(null, rows[0]?.room_id || false);
    },
  );
};

const validateEvent = ({ title, start_at, end_at, reminder_minutes }) => {
  if (!title || !title.trim()) return "Event title is required.";
  if (!start_at || !DATE_TIME_PATTERN.test(start_at)) {
    return "A valid event start date and time are required.";
  }
  if (end_at && !DATE_TIME_PATTERN.test(end_at)) return "The event end date and time is invalid.";
  if (end_at && new Date(end_at.replace(" ", "T")) < new Date(start_at.replace(" ", "T"))) {
    return "The event end must be after its start.";
  }
  if (
    reminder_minutes !== null &&
    reminder_minutes !== undefined &&
    ![0, 5, 10, 15, 30, 60, 1440].includes(Number(reminder_minutes))
  ) {
    return "The reminder option is invalid.";
  }
  return null;
};

const selectEvent = (eventId, roomId, callback) => {
  db.query(
    `SELECT event_id, room_id, title, description, start_at, end_at, reminder_minutes,
            created_by, date_created, date_updated
       FROM calendar_event WHERE event_id = ? AND room_id = ?`,
    [eventId, roomId],
    callback,
  );
};

router.get("/", authenticateOfficer, (req, res) => {
  getOfficerRoomId(req, req.query.roomId, (roomError, roomId) => {
    if (roomError) return res.status(500).json({ message: "Unable to identify the room." });
    if (!roomId) return res.status(403).json({ message: "You are not a member of this room." });
    db.query(
      `SELECT event_id, room_id, title, description, start_at, end_at, reminder_minutes,
              created_by, date_created, date_updated
         FROM calendar_event WHERE room_id = ?
        ORDER BY start_at ASC, event_id ASC`,
      [roomId],
      (err, results) => {
        if (err) {
          console.error("Calendar events query error:", err);
          return res.status(500).json({ message: "Unable to load calendar events." });
        }
        res.json(results);
      },
    );
  });
});

router.post("/", authenticateOfficer, (req, res) => {
  const { title, description, start_at, end_at, reminder_minutes } = req.body;
  const validationError = validateEvent(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  getOfficerRoomId(req, req.body.room_id, (roomError, roomId) => {
    if (roomError) return res.status(500).json({ message: "Unable to identify the room." });
    if (!roomId) return res.status(403).json({ message: "You are not a member of this room." });
    db.query(
      `INSERT INTO calendar_event
        (room_id, title, description, start_at, end_at, reminder_minutes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        roomId,
        title.trim(),
        description?.trim() || null,
        start_at,
        end_at || null,
        reminder_minutes === "" || reminder_minutes === undefined ? null : Number(reminder_minutes),
        getOfficerId(req),
      ],
      (err, result) => {
        if (err) {
          console.error("Calendar event creation error:", err);
          return res.status(500).json({ message: "Unable to create calendar event." });
        }
        selectEvent(result.insertId, roomId, (selectErr, rows) => {
          if (selectErr) {
            console.error("Created calendar event lookup error:", selectErr);
            return res.status(500).json({ message: "Event was created but could not be loaded." });
          }
          res.status(201).json(rows[0]);
        });
      },
    );
  });
});

router.put("/:id", authenticateOfficer, (req, res) => {
  const { title, description, start_at, end_at, reminder_minutes } = req.body;
  const validationError = validateEvent(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  getOfficerRoomId(req, req.body.room_id, (roomError, roomId) => {
    if (roomError) return res.status(500).json({ message: "Unable to identify the room." });
    if (!roomId) return res.status(403).json({ message: "You are not a member of this room." });
    db.query(
      `UPDATE calendar_event
          SET title = ?, description = ?, start_at = ?, end_at = ?,
              reminder_minutes = ?, date_updated = CURRENT_TIMESTAMP
        WHERE event_id = ? AND room_id = ? AND created_by = ?`,
      [
        title.trim(),
        description?.trim() || null,
        start_at,
        end_at || null,
        reminder_minutes === "" || reminder_minutes === undefined ? null : Number(reminder_minutes),
        req.params.id,
        roomId,
        getOfficerId(req),
      ],
      (err, result) => {
        if (err) {
          console.error("Calendar event update error:", err);
          return res.status(500).json({ message: "Unable to update calendar event." });
        }
        if (!result.affectedRows) {
          return res.status(404).json({ message: "Event not found or you cannot edit it." });
        }
        res.json({ message: "Calendar event updated." });
      },
    );
  });
});

router.delete("/:id", authenticateOfficer, (req, res) => {
  getOfficerRoomId(req, req.query.roomId, (roomError, roomId) => {
    if (roomError) return res.status(500).json({ message: "Unable to identify the room." });
    if (!roomId) return res.status(403).json({ message: "You are not a member of this room." });
    db.query(
      "DELETE FROM calendar_event WHERE event_id = ? AND room_id = ? AND created_by = ?",
      [req.params.id, roomId, getOfficerId(req)],
      (err, result) => {
        if (err) {
          console.error("Calendar event deletion error:", err);
          return res.status(500).json({ message: "Unable to delete calendar event." });
        }
        if (!result.affectedRows) {
          return res.status(404).json({ message: "Event not found or you cannot delete it." });
        }
        res.json({ message: "Calendar event deleted." });
      },
    );
  });
});

export default router;
