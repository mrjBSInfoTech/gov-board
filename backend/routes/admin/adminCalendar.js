import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { getAdminCollegeFilter } from "../../utils/shared/adminScope.js";
import {
  getAdminEventScope,
  getRoomCalendarEventPredicate,
} from "../../utils/shared/calendarEventScope.js";

const router = express.Router();
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60, 1440];
const getDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const validateEvent = ({ title, start_at, end_at, reminder_minutes }) => {
  if (typeof title !== "string" || !title.trim()) return "Event title is required.";
  if (!start_at || !DATE_TIME_PATTERN.test(start_at)) {
    return "A valid event start date and time are required.";
  }
  if (start_at.slice(0, 10) < getDateKey(new Date())) {
    return "Events can only be scheduled for today or a future date.";
  }
  if (end_at && !DATE_TIME_PATTERN.test(end_at)) {
    return "The event end date and time is invalid.";
  }
  if (
    end_at &&
    new Date(end_at.replace(" ", "T")) < new Date(start_at.replace(" ", "T"))
  ) {
    return "The event end must be after its start.";
  }
  if (
    reminder_minutes !== null &&
    reminder_minutes !== undefined &&
    reminder_minutes !== "" &&
    !REMINDER_OPTIONS.includes(Number(reminder_minutes))
  ) {
    return "The reminder option is invalid.";
  }
  return null;
};

const getManageFilter = (req, eventAlias = "e") =>
  req.user.is_super_admin
    ? {
        sql: ` AND ${eventAlias}.visibility_scope IN ('global', 'college')`,
        params: [],
      }
    : {
        sql: ` AND ${eventAlias}.visibility_scope = 'college'
              AND ${eventAlias}.college = ?`,
        params: [req.user.college],
      };

const selectEvent = async (eventId) => {
  const [rows] = await db.promise().query(
    `SELECT event_id, room_id, visibility_scope, college, title, description,
            start_at, end_at, reminder_minutes, date_created, date_updated
       FROM calendar_event
      WHERE event_id = ?`,
    [eventId],
  );
  return rows[0];
};

router.get("/", authenticateAdmin, async (req, res) => {
  const adminVisibilityFilter = req.user.is_super_admin
    ? ""
    : ` AND (
        e.visibility_scope = 'global'
        OR (e.visibility_scope = 'college' AND e.college = ?)
        OR (e.visibility_scope = 'room' AND r.college = ?)
      )`;
  const params = req.user.is_super_admin
    ? []
    : [req.user.college, req.user.college];

  try {
    const [events] = await db.promise().query(
      `SELECT e.event_id, e.room_id, r.room_name, e.visibility_scope, e.college, e.title,
              e.description, e.start_at, e.end_at, e.reminder_minutes,
              e.date_created, e.date_updated,
              CASE
                WHEN (
                  ${req.user.is_super_admin
                    ? "e.visibility_scope IN ('global', 'college')"
                    : "(e.visibility_scope = 'college' AND e.college = ?)"}
                ) THEN 1
                ELSE 0
              END AS can_manage
         FROM calendar_event e
         LEFT JOIN room r ON r.room_id = e.room_id
        WHERE e.start_at >= CURRENT_DATE${adminVisibilityFilter}
        ORDER BY e.start_at ASC, e.event_id ASC`,
      req.user.is_super_admin
        ? params
        : [req.user.college, ...params],
    );
    res.json(events);
  } catch (error) {
    console.error("Admin calendar events query error:", error);
    res.status(500).json({ message: "Unable to load calendar events." });
  }
});

router.get("/room/:roomId", authenticateAdmin, async (req, res) => {
  const roomId = Number(req.params.roomId);
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ message: "A valid room ID is required." });
  }

  const collegeFilter = getAdminCollegeFilter(req, "r.college");
  try {
    const [events] = await db.promise().query(
      `SELECT e.event_id, e.room_id, e.visibility_scope, e.college, e.title,
              e.description, e.start_at, e.end_at, e.reminder_minutes,
              e.created_by, e.date_created, e.date_updated
         FROM room r
         JOIN calendar_event e ON ${getRoomCalendarEventPredicate()}
        WHERE r.room_id = ?${collegeFilter.sql}
          AND e.start_at >= CURRENT_DATE
        ORDER BY e.start_at ASC, e.event_id ASC`,
      [roomId, ...collegeFilter.params],
    );
    res.json(events);
  } catch (error) {
    console.error("Admin room calendar query error:", error);
    res.status(500).json({ message: "Unable to load room calendar events." });
  }
});

router.post("/", authenticateAdmin, async (req, res) => {
  const validationError = validateEvent(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const { visibilityScope, college } = getAdminEventScope(req.user);
  const {
    title,
    description,
    start_at: startAt,
    end_at: endAt,
    reminder_minutes: reminderMinutes,
  } = req.body;

  try {
    const [result] = await db.promise().query(
      `INSERT INTO calendar_event
        (room_id, visibility_scope, college, title, description, start_at,
         end_at, reminder_minutes, created_by, created_by_admin)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        visibilityScope,
        college,
        title.trim(),
        description?.trim() || null,
        startAt,
        endAt || null,
        reminderMinutes === "" || reminderMinutes === undefined
          ? null
          : Number(reminderMinutes),
        req.user.admin_id,
      ],
    );
    const event = await selectEvent(result.insertId);
    if (!event) {
      return res.status(500).json({ message: "Event was created but could not be loaded." });
    }
    event.can_manage = 1;
    res.status(201).json(event);
  } catch (error) {
    console.error("Admin calendar event creation error:", error);
    res.status(500).json({ message: "Unable to create calendar event." });
  }
});

router.put("/:id", authenticateAdmin, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isSafeInteger(eventId) || eventId < 1) {
    return res.status(400).json({ message: "A valid event ID is required." });
  }
  const validationError = validateEvent(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const manageFilter = getManageFilter(req);
  const {
    title,
    description,
    start_at: startAt,
    end_at: endAt,
    reminder_minutes: reminderMinutes,
  } = req.body;

  try {
    const [result] = await db.promise().query(
      `UPDATE calendar_event
          SET title = ?, description = ?, start_at = ?, end_at = ?,
              reminder_minutes = ?, date_updated = CURRENT_TIMESTAMP
        WHERE event_id = ?${manageFilter.sql}`,
      [
        title.trim(),
        description?.trim() || null,
        startAt,
        endAt || null,
        reminderMinutes === "" || reminderMinutes === undefined
          ? null
          : Number(reminderMinutes),
        eventId,
        ...manageFilter.params,
      ],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Event not found or you cannot edit it." });
    }
    res.json({ message: "Calendar event updated." });
  } catch (error) {
    console.error("Admin calendar event update error:", error);
    res.status(500).json({ message: "Unable to update calendar event." });
  }
});

router.delete("/:id", authenticateAdmin, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isSafeInteger(eventId) || eventId < 1) {
    return res.status(400).json({ message: "A valid event ID is required." });
  }
  const manageFilter = getManageFilter(req);

  try {
    const [result] = await db.promise().query(
      `DELETE FROM calendar_event WHERE event_id = ?${manageFilter.sql}`,
      [eventId, ...manageFilter.params],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Event not found or you cannot delete it." });
    }
    res.json({ message: "Calendar event deleted." });
  } catch (error) {
    console.error("Admin calendar event deletion error:", error);
    res.status(500).json({ message: "Unable to delete calendar event." });
  }
});

export default router;
