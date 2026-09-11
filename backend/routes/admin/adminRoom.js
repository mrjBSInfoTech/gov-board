import express from "express";
// Ensure this points to your actual Supabase client configuration
import supabase from "../../config/supabase.js"; 
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
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const { data: result, error } = await supabase
      .from("room")
      .select("room_id, room_number, room_name, date_created")
      .order("date_created", { ascending: false });

    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Database error" });
    }
    
    res.json(result);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET generate a new unique room code
router.get("/generate-code", authenticateAdmin, (req, res) => {
  const code = generateRoomCode();
  res.json({ code });
});

// POST create new room
router.post("/", authenticateAdmin, async (req, res) => {
  const { room_number, room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  // Use provided code or generate one
  const roomCode = room_number || generateRoomCode();

  try {
    // Note: We omit date_created because your database schema handles the DEFAULT CURRENT_TIMESTAMP
    const { data, error } = await supabase
      .from("room")
      .insert([{ room_number: roomCode, room_name }])
      .select(); // .select() returns the inserted row so we can get the new room_id

    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(201).json({
      message: "Room created",
      room_id: data[0].room_id,
      room_number: roomCode,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT update room
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { room_number, room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  try {
    const { data, error } = await supabase
      .from("room")
      .update({ room_number, room_name })
      .eq("room_id", id)
      .select(); 

    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    // If data is empty, it means no room was found with that ID
    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ message: "Room updated" });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE room
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("room")
      .delete()
      .eq("room_id", id)
      .select();

    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    // If data is empty, it means no room was found to delete
    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ message: "Room deleted" });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

// Backup code
{/*
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
*/}