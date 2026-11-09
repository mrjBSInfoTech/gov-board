import express from "express";
import db from "../../database/db.js";
import { authenticateStudent } from "../../middleware/studentAuthMiddleware.js";
import { logStudentAudit } from "../../utils/student/studentAuditLogger.js";
import { findRoomByCode } from "../../utils/shared/roomJoin.js";

const router = express.Router();

// GET validate a room code
router.get("/room/validate/:roomNumber", authenticateStudent, async (req, res) => {
  const studentId = Number(req.user.student_id);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(403).json({ error: "Unable to identify student" });
  }

  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const room = await findRoomByCode(connection, req.params.roomNumber);
    if (!room) {
      await connection.rollback();
      return res.status(404).json({ error: "Invalid room code" });
    }

    await connection.query(
      "DELETE FROM room_member WHERE room_id = ? AND member_id = ?",
      [room.room_id, studentId],
    );
    await connection.query(
      `INSERT INTO room_member (room_id, member_type, member_id, position)
       VALUES (?, 'student', ?, 'Student')`,
      [room.room_id, studentId],
    );
    await connection.commit();
    req.auditRoomId = room.room_id;

    void logStudentAudit(studentId, {
      action: "Join room",
      role: "Student",
      status: "SUCCESS",
      room_id: room.room_id,
      information: `Joined room ${room.room_id}`,
    });
    res.json({
      ...room,
      member_type: "student",
      position: "Student",
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Student room join rollback error:", rollbackError);
    }
    console.error("Student room join error:", error);
    res.status(500).json({ error: "Unable to join room" });
  }
});

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
        `SELECT announcement_id, room_id, announcement_body, link, image,
                date_created
           FROM announcement
          WHERE room_id = ?
          ORDER BY date_created DESC, announcement_id DESC`,
        [roomId],
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
