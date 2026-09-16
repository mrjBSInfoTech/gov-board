import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// Helper: generate a Google Classroom-style room code (e.g. "abc-1x2y")
const generateRoomCode = () => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const alphanumeric = "abcdefghijklmnopqrstuvwxyz0123456789";
  const part1 = Array.from(
    { length: 3 },
    () => letters[Math.floor(Math.random() * letters.length)],
  ).join("");
  const part2 = Array.from(
    { length: 4 },
    () => alphanumeric[Math.floor(Math.random() * alphanumeric.length)],
  ).join("");
  return `${part1}-${part2}`;
};

// GET all rooms
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT room_id, room_number, room_name, date_created
    FROM room
    ORDER BY date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(result);
  });
});

// GET generate a new unique room code
router.get("/generate-code", authenticateAdmin, (req, res) => {
  const code = generateRoomCode();
  res.json({ code });
});

// POST create new room
router.post("/", authenticateAdmin, (req, res) => {
  const { room_number, room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  // Use provided code or generate one
  const roomCode = room_number || generateRoomCode();

  const sql = `
    INSERT INTO room (room_number, room_name, date_created)
    VALUES (?, ?, NOW())`;

  db.query(sql, [roomCode, room_name], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(201).json({
      message: "Room created",
      room_id: result.insertId,
      room_number: roomCode,
    });
  });
});

// PUT update room
router.put("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { room_number, room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  const sql = `UPDATE room SET room_number = ?, room_name = ? WHERE room_id = ?`;

  db.query(sql, [room_number, room_name, id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ message: "Room updated" });
  });
});

// DELETE room
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM room WHERE room_id = ?", [id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ message: "Room deleted" });
  });
});

export default router;

// Backup code
{
  /*
import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// Helper: generate a Google Classroom-style room code (e.g. "abc-1x2y")
const generateRoomCode = () => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const alphanumeric = "abcdefghijklmnopqrstuvwxyz0123456789";
  const part1 = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => alphanumeric[Math.floor(Math.random() * alphanumeric.length)]).join("");
  return `${part1}-${part2}`;
};

// GET all rooms
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT room_id, room_number, room_name, date_created
    FROM room
    ORDER BY date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(result);
  });
});

// GET generate a new unique room code
router.get("/generate-code", authenticateAdmin, (req, res) => {
  const code = generateRoomCode();
  res.json({ code });
});

// POST create new room
router.post("/", authenticateAdmin, (req, res) => {
  const { room_number, room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  // Use provided code or generate one
  const roomCode = room_number || generateRoomCode();

  const sql = `
    INSERT INTO room (room_number, room_name, date_created)
    VALUES (?, ?, NOW())`;

  db.query(sql, [roomCode, room_name], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(201).json({
      message: "Room created",
      room_id: result.insertId,
      room_number: roomCode,
    });
  });
});

// PUT update room
router.put("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { room_number, room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  const sql = `UPDATE room SET room_number = ?, room_name = ? WHERE room_id = ?`;

  db.query(sql, [room_number, room_name, id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json({ message: "Room updated" });
  });
});

// DELETE room
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM room WHERE room_id = ?", [id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json({ message: "Room deleted" });
  });
});

export default router;
*/
}
