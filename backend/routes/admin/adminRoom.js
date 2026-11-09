import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { getAdminCollegeFilter } from "../../utils/shared/adminScope.js";
import { clearOrphanedOfficerStatus } from "../../utils/shared/roomOfficerAccess.js";

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
router.get("/", authenticateAdmin, async (req, res) => {
  const collegeFilter = getAdminCollegeFilter(req, "college");
  const sql = `
    SELECT room_id, room_number, room_name, description, college, date_created
    FROM room
    WHERE 1 = 1${collegeFilter.sql}
    ORDER BY date_created DESC`;

  try {
    const connection = db.promise();
    const [rooms] = await connection.query(sql, collegeFilter.params);
    res.json(rooms);
  } catch (error) {
    console.error("Room list error:", error);
    res.status(500).json({ message: "Unable to load rooms." });
  }
});

// GET generate a new unique room code
router.get("/generate-code", authenticateAdmin, (req, res) => {
  const code = generateRoomCode();
  res.json({ code });
});

// GET one room
router.get("/:id", authenticateAdmin, async (req, res) => {
  const collegeFilter = getAdminCollegeFilter(req, "college");
  const sql = `
    SELECT room_id, room_number, room_name, description, college, date_created
    FROM room
    WHERE room_id = ?${collegeFilter.sql}
    LIMIT 1`;

  try {
    const connection = db.promise();
    const [rooms] = await connection.query(sql, [
      req.params.id,
      ...collegeFilter.params,
    ]);
    if (!rooms.length) return res.status(404).json({ message: "Room not found" });
    res.json(rooms[0]);
  } catch (error) {
    console.error("Room lookup error:", error);
    res.status(500).json({ message: "Unable to load room." });
  }
});

// GET announcements for a room
router.get("/:id/announcements", authenticateAdmin, (req, res) => {
  const collegeFilter = getAdminCollegeFilter(req, "r.college");
  const sql = `
    SELECT 
      a.announcement_id,
      a.room_id,
      a.announcement_body,
      a.link,
      a.image,
      a.date_created
    FROM announcement a
    INNER JOIN room r ON r.room_id = a.room_id
    WHERE a.room_id = ?${collegeFilter.sql}
    ORDER BY a.date_created DESC, a.announcement_id DESC
  `;
  db.query(sql, [req.params.id, ...collegeFilter.params], (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST create new room
router.post("/", authenticateAdmin, async (req, res) => {
  const { room_number, room_name, description } = req.body;
  const cleanName = typeof room_name === "string" ? room_name.trim() : "";
  const cleanDescription =
    typeof description === "string" ? description.trim() : "";
  if (!cleanName || !cleanDescription) {
    return res.status(400).json({ message: "Room name and description are required." });
  }
  if (cleanName.length > 100 || cleanDescription.length > 2000) {
    return res.status(400).json({ message: "Room name or description is too long." });
  }
  const roomCode = room_number || generateRoomCode();
  const college = req.user.is_super_admin ? null : req.user.college;

  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO room
        (room_number, room_name, description, college, date_created)
       VALUES (?, ?, ?, ?, NOW())`,
      [roomCode, cleanName, cleanDescription, college],
    );
    await connection.commit();
    res.status(201).json({
      message: "Room created",
      room_id: result.insertId,
      room_number: roomCode,
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Room code is already in use." });
    }
    console.error("Room creation error:", error);
    res.status(500).json({ message: "Unable to create room." });
  }
});

// PUT update room
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { room_number, room_name, description } = req.body;
  const cleanName = typeof room_name === "string" ? room_name.trim() : "";
  const cleanDescription =
    typeof description === "string" ? description.trim() : "";
  if (!cleanName || !cleanDescription) {
    return res.status(400).json({ message: "Room name and description are required." });
  }
  if (cleanName.length > 100 || cleanDescription.length > 2000) {
    return res.status(400).json({ message: "Room name or description is too long." });
  }

  const collegeFilter = getAdminCollegeFilter(req, "college");
  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const [rooms] = await connection.query(
      `SELECT room_id FROM room
        WHERE room_id = ?${collegeFilter.sql}
        LIMIT 1 FOR UPDATE`,
      [id, ...collegeFilter.params],
    );
    if (!rooms.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Room not found" });
    }
    await connection.query(
      `UPDATE room
          SET room_number = ?, room_name = ?, description = ?
        WHERE room_id = ?${collegeFilter.sql}`,
      [
        room_number,
        cleanName,
        cleanDescription,
        id,
        ...collegeFilter.params,
      ],
    );
    await connection.commit();
    res.json({ message: "Room updated" });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Room code is already in use." });
    }
    console.error("Room update error:", error);
    res.status(500).json({ message: "Unable to update room." });
  }
});

// DELETE room and remove its member records atomically.
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const collegeFilter = getAdminCollegeFilter(req, "college");
  const connection = db.promise();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [rooms] = await connection.query(
      `SELECT room_id FROM room
        WHERE room_id = ?${collegeFilter.sql}
        LIMIT 1 FOR UPDATE`,
      [id, ...collegeFilter.params],
    );
    if (!rooms.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: "Room not found" });
    }

    const [roomMembers] = await connection.query(
      `SELECT member_id FROM room_member
        WHERE room_id = ?
        FOR UPDATE`,
      [id],
    );
    await connection.query("DELETE FROM room_member WHERE room_id = ?", [id]);
    const [result] = await connection.query(
      `DELETE FROM room WHERE room_id = ?${collegeFilter.sql}`,
      [id, ...collegeFilter.params],
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: "Room not found" });
    }

    await clearOrphanedOfficerStatus(
      connection,
      roomMembers.map(({ member_id }) => member_id),
    );

    await connection.commit();
    transactionStarted = false;
    res.json({ message: "Room deleted" });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error("Room deletion error:", error);
    res.status(500).json({ message: "Unable to delete room." });
  }
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
