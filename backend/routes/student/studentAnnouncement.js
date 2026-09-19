import express from "express";
import db from "../../database/db.js";
import { authenticateStudent } from "../../middleware/studentAuthMiddleware.js";

const router = express.Router();

// GET validate a room code
router.get("/room/validate/:roomNumber", authenticateStudent, (req, res) => {
  const { roomNumber } = req.params;

  const sql = `
    SELECT room_id, room_number, room_name 
    FROM room 
    WHERE room_number = ? 
    LIMIT 1`;

  db.query(sql, [roomNumber], (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: "Failed to validate room code" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Invalid room code" });
    }

    res.json(results[0]);
  });
});

// GET all announcements for a room
router.get("/", authenticateStudent, (req, res) => {
  const { roomId } = req.query;

  if (!roomId) {
    return res.status(400).json({ error: "roomId is required" });
  }

  const sql = `
    SELECT 
      announcement_id,
      room_id,
      announcement_body,
      link,
      image,
      date_created
    FROM announcement
    WHERE room_id = ?
    ORDER BY date_created DESC, announcement_id DESC
  `;

  db.query(sql, [roomId], (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

export default router;
