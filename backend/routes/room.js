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
      req.user = user;
      next();
    },
  );
};

router.get("/:roomId/members", authenticateRoomUser, (req, res) => {
  const officerId = req.user.officer_id || 0;
  const adminId = req.user.admin_id || 0;
  db.query(
    `SELECT officer_id AS member_id, first_name, last_name, position, section, 'officer' AS member_type
     FROM officer
     WHERE officer_id = ? OR (admin_id = ? AND ? > 0)
     UNION ALL
    SELECT admin_id AS member_id, first_name, last_name, role AS position, NULL AS section, 'admin' AS member_type
    FROM admin
     WHERE (admin_id = ? AND ? > 0)
       OR (admin_id IN (SELECT admin_id FROM officer WHERE officer_id = ?) AND ? > 0)
    UNION ALL
     SELECT student_id AS member_id, first_name, last_name, position, section, 'student' AS member_type
     FROM student
     WHERE room_id = ?
        OR (officer_id = ? AND ? > 0)
        OR (officer_id IN (SELECT officer_id FROM officer WHERE admin_id = ?) AND ? > 0)
     ORDER BY first_name ASC, last_name ASC`,
    [
      officerId,
      adminId,
      adminId,
      adminId,
      adminId,
      officerId,
      officerId,
      req.params.roomId,
      officerId,
      officerId,
      adminId,
      adminId,
    ],
    (err, results) => {
      if (err) {
        console.error("Room member read error:", err);
        return res.status(500).json({ error: "Unable to load room members" });
      }
      res.json(results);
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
