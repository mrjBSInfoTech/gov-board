import express from "express";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();

// Get absolute path for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "officer",
  "uploadAnnouncement"
);

// ✅ Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Image upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname);
    const safeName = originalName.replace(/[^a-zA-Z0-9_-]/g, "_");

    let filename = `${safeName}${ext}`;
    let counter = 1;

    while (fs.existsSync(path.join(uploadDir, filename))) {
      filename = `${safeName}_${counter}${ext}`;
      counter++;
    }

    cb(null, filename);
  },
});

const upload = multer({ storage });

// 🟢 Get all announcements (optionally filter by room_id)
router.get("/", authenticateOfficer, (req, res) => {
  const { roomId } = req.query;

  let sql = `
    SELECT 
      announcement_id,
      room_id,
      announcement_body,
      link,
      image,
      date_created
    FROM announcement
  `;
  const params = [];

  if (roomId) {
    sql += ` WHERE room_id = ? `;
    params.push(roomId);
  }

  sql += ` ORDER BY date_created DESC, announcement_id DESC`;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 🏢 Validate room code
router.get("/room/validate/:roomNumber", authenticateOfficer, (req, res) => {
  const { roomNumber } = req.params;
  const sql = `SELECT room_id, room_number, room_name FROM room WHERE room_number = ?`;
  
  db.query(sql, [roomNumber.trim()], (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Room not found. Please check the code." });
    }

    const officerId = req.user.officer_id;
    const connection = db.promise();
    connection.beginTransaction()
      .then(() => connection.query(
        "DELETE FROM room_member WHERE member_type = 'officer' AND member_id = ?",
        [officerId],
      ))
      .then(() => connection.query(
        `UPDATE student
         SET position = 'Student', role = NULL,
             can_add = 0, can_edit = 0, can_delete = 0, can_moderate = 0
         WHERE student_id = ?`,
        [officerId],
      ))
      .then(() => connection.query(
        `INSERT INTO room_member (room_id, member_type, member_id)
         VALUES (?, 'student', ?)
         ON DUPLICATE KEY UPDATE member_type = 'student'`,
        [results[0].room_id, officerId],
      ))
      .then(() => connection.commit())
      .then(() => res.json(results[0]))
      .catch(async (error) => {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error("Room switch rollback error:", rollbackError);
        }
        console.error("Room switch error:", error);
        return res.status(500).json({ error: "Unable to join room" });
      });
  });
});

// Leave the current room and return the officer account to a regular student.
router.delete("/room", authenticateOfficer, (req, res) => {
  const officerId = req.user.officer_id;
  const connection = db.promise();

  connection.beginTransaction()
    .then(() => connection.query(
      "DELETE FROM room_member WHERE member_type = 'officer' AND member_id = ?",
      [officerId],
    ))
    .then(([result]) => {
      if (result.affectedRows === 0) {
        const error = new Error("Room membership not found");
        error.statusCode = 404;
        throw error;
      }
      return connection.query(
        `UPDATE student
         SET position = 'Student', role = NULL,
             can_add = 0, can_edit = 0, can_delete = 0, can_moderate = 0
         WHERE student_id = ?`,
        [officerId],
      );
    })
    .then(() => connection.commit())
    .then(() => res.json({ message: "You left the room and are now a student." }))
    .catch(async (error) => {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Officer leave rollback error:", rollbackError);
      }
      if (error.statusCode === 404) {
        return res.status(404).json({ error: "Room membership not found" });
      }
      console.error("Officer leave room error:", error);
      return res.status(500).json({ error: "Unable to leave room" });
    });
});

// 🔍 Get single announcement by ID
router.get("/:id", authenticateOfficer, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      announcement_id,
      room_id,
      announcement_body,
      link,
      image,
      date_created
    FROM announcement
    WHERE announcement_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    res.json(results[0]);
  });
});

// ➕ Add new announcement
router.post("/", authenticateOfficer, upload.single("file"), (req, res) => {
  const { announcement_body, link, room_id } = req.body;

  // Validate required fields
  if (!announcement_body || !announcement_body.trim()) {
    return res.status(400).json({ error: "Announcement body is required" });
  }

  const imageName = req.file ? req.file.filename : null;
  console.log("New announcement image:", imageName);

  const sql = `
    INSERT INTO announcement 
    (announcement_body, link, image, room_id) 
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      announcement_body.trim(),
      link?.trim() || null,
      imageName,
      room_id || null,
    ],
    (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: "Announcement added successfully",
        id: result.insertId,
        image: imageName,
      });
    }
  );
});

// ✏️ Update announcement
router.put("/:id", authenticateOfficer, upload.single("file"), (req, res) => {
  const { id } = req.params;
  const { announcement_body, link, room_id } = req.body;

  // Validate required fields
  if (!announcement_body || !announcement_body.trim()) {
    return res.status(400).json({ error: "Announcement body is required" });
  }

  // If new file is uploaded, delete old image file from storage
  if (req.file) {
    db.query(
      "SELECT image FROM announcement WHERE announcement_id = ?",
      [id],
      (err, results) => {
        if (results && results[0]?.image) {
          const oldImagePath = path.join(uploadDir, results[0].image);
          if (fs.existsSync(oldImagePath)) {
            try {
              fs.unlinkSync(oldImagePath);
              console.log("Deleted old image:", results[0].image);
            } catch (unlinkErr) {
              console.error("Error deleting old image:", unlinkErr);
            }
          }
        }
      }
    );
  }

  const imageName = req.file ? req.file.filename : null;
  console.log("Updated announcement image:", imageName || "(no change)");

  const sql = `
    UPDATE announcement 
    SET 
      announcement_body = ?, 
      link = ?, 
      image = COALESCE(?, image), 
      room_id = COALESCE(?, room_id)
    WHERE announcement_id = ?
  `;

  db.query(
    sql,
    [
      announcement_body.trim(),
      link?.trim() || null,
      imageName,
      room_id || null,
      id,
    ],
    (err) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Announcement updated successfully" });
    }
  );
});

// 🗑️ Delete announcement
router.delete("/:id", authenticateOfficer, (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT image FROM announcement WHERE announcement_id = ?",
    [id],
    (err, results) => {
      if (results && results[0]?.image) {
        const imagePath = path.join(uploadDir, results[0].image);
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
            console.log("Deleted image:", results[0].image);
          } catch (unlinkErr) {
            console.error("Error deleting image:", unlinkErr);
          }
        }
      }

      db.query(
        "DELETE FROM announcement WHERE announcement_id = ?",
        [id],
        (err) => {
          if (err) {
            console.error("DB Error:", err);
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: "Announcement deleted successfully" });
        }
      );
    }
  );
});

export default router;
