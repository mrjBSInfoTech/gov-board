import express from "express";
import jwt from "jsonwebtoken";
import db from "../database/db.js";

const router = express.Router();

const authenticateRoomUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your_secret_key",
    (err, user) => {
      if (err)
        return res.status(403).json({ message: "Invalid or expired token." });

      if (!user.officer_id) {
        req.user = user;
        return next();
      }

      db.query(
        "SELECT role FROM student WHERE student_id = ? LIMIT 1",
        [user.officer_id],
        (roleError, rows) => {
          if (roleError) {
            console.error("Room account role verification error:", roleError);
            return res.status(500).json({ message: "Unable to verify account role." });
          }
          if (rows.length === 0 || !rows[0].role) {
            return res.status(403).json({
              message: "This account is now a student. Please use the student panel.",
              roleChanged: true,
            });
          }

          req.user = user;
          next();
        },
      );
    },
  );
};

router.get("/:roomId/members", authenticateRoomUser, (req, res) => {
  db.query(
     `SELECT rm.member_id, s.first_name, s.last_name, s.position,
       b.section_name AS section,
       CASE WHEN s.role IS NOT NULL THEN 'officer' ELSE 'student' END AS member_type
     FROM room_member rm
     INNER JOIN student s ON s.student_id = rm.member_id
     LEFT JOIN batch b ON b.batch_id = s.batch_id
     WHERE rm.room_id = ?
     ORDER BY first_name ASC, last_name ASC`,
     [req.params.roomId],
    (err, results) => {
      if (err) {
        console.error("Room member read error:", err);
        return res.status(500).json({ error: "Unable to load room members" });
      }
      res.json(results);
    },
  );
});

router.get("/my-room", authenticateRoomUser, (req, res) => {
  const memberId = req.user.officer_id || req.user.student_id || req.user.id;

  if (!memberId) {
    return res.status(403).json({ message: "Unable to identify room member." });
  }

  db.query(
    `SELECT r.room_id, r.room_number, r.room_name, r.date_created
     FROM room_member rm
     INNER JOIN room r ON r.room_id = rm.room_id
     INNER JOIN student s ON s.student_id = rm.member_id
     WHERE rm.member_id = ?
       AND (rm.member_type = CASE WHEN s.role IS NULL THEN 'student' ELSE 'officer' END
            OR rm.member_type IS NULL)
     ORDER BY rm.date_joined DESC, rm.room_id DESC
     LIMIT 1`,
    [memberId],
    (err, results) => {
      if (err) {
        console.error("Current room lookup error:", err);
        return res.status(500).json({ message: "Unable to load current room" });
      }

      res.json(results[0] || null);
    },
  );
});

router.get("/:roomId/messages", authenticateRoomUser, (req, res) => {
  db.query(
    `SELECT message_id, room_id, sender_name, message, date_created
     FROM room_message WHERE room_id = ? ORDER BY date_created ASC, message_id ASC`,
    [req.params.roomId],
    (err, results) => {
      if (err) {
        console.error("Room message read error:", err);
        return res.status(500).json({ error: "Unable to load room messages" });
      }
      res.json(results);
    },
  );
});

router.post("/:roomId/messages", authenticateRoomUser, (req, res) => {
  const message = req.body.message?.trim();
  const senderName = req.body.sender_name?.trim() || "Room member";
  const senderId =
    req.user.officer_id || req.user.student_id || req.user.id || null;
  const senderType = req.user.officer_id
    ? "officer"
    : req.user.admin_id
      ? "admin"
      : "student";

  if (!message) return res.status(400).json({ error: "Message is required" });
  if (message.length > 2000)
    return res.status(400).json({ error: "Message is too long" });

  db.query(
    `INSERT INTO room_message (room_id, sender_id, sender_type, sender_name, message)
     VALUES (?, ?, ?, ?, ?)`,
    [req.params.roomId, senderId, senderType, senderName, message],
    (err, result) => {
      if (err) {
        console.error("Room message write error:", err);
        return res.status(500).json({ error: "Unable to send room message" });
      }
      res.status(201).json({
        message_id: result.insertId,
        room_id: Number(req.params.roomId),
        sender_name: senderName,
        message,
        date_created: new Date().toISOString(),
      });
    },
  );
});

export default router;
