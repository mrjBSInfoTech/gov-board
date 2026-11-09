import express from "express";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";
import { findRoomByCode } from "../../utils/shared/roomJoin.js";

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
const removeUploadedFile = (file) => {
  if (!file) return;
  fs.unlink(file.path, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Unable to remove rejected announcement upload:", error);
    }
  });
};

const requireRoomMembership = (getRoomId, allowedTypes) => (req, res, next) => {
  const roomId = Number(getRoomId(req));
  const memberId = Number(req.user.officer_id);
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ error: "A valid roomId is required." });
  }
  db.query(
    `SELECT member_type FROM room_member
      WHERE room_id = ? AND member_id = ? LIMIT 1`,
    [roomId, memberId],
    (err, rows) => {
      if (err) {
        console.error("Room membership lookup error:", err);
        return res.status(500).json({ error: "Unable to verify room membership." });
      }
      if (!rows.length || !allowedTypes.includes(rows[0].member_type)) {
        return res.status(403).json({ error: "You do not have access to this room." });
      }
      req.roomId = roomId;
      req.roomMemberType = rows[0].member_type;
      next();
    },
  );
};

router.get(
  "/",
  authenticateOfficer,
  requireRoomMembership((req) => req.query.roomId, ["student", "officer"]),
  (req, res) => {
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
    ORDER BY date_created DESC, announcement_id DESC`;

    db.query(sql, [req.roomId], (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Unable to load announcements." });
      }
      res.json(results);
    });
  },
);

// 🏢 Validate room code
router.get("/room/validate/:roomNumber", authenticateOfficer, async (req, res) => {
  const officerId = Number(req.user.officer_id);
  if (!Number.isSafeInteger(officerId) || officerId < 1) {
    return res.status(403).json({ error: "Unable to identify officer" });
  }

  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const room = await findRoomByCode(connection, req.params.roomNumber);
    if (!room) {
      await connection.rollback();
      return res.status(404).json({ error: "Room not found. Please check the code." });
    }

    await connection.query(
      "DELETE FROM room_member WHERE room_id = ? AND member_id = ?",
      [room.room_id, officerId],
    );
    await connection.query(
      `INSERT INTO room_member (room_id, member_type, member_id, position)
       VALUES (?, 'student', ?, 'Student')`,
      [room.room_id, officerId],
    );
    await connection.commit();
    req.auditRoomId = room.room_id;
    res.json({
      ...room,
      member_type: "student",
      position: "Student",
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Officer room join rollback error:", rollbackError);
    }
    console.error("Officer room join error:", error);
    res.status(500).json({ error: "Unable to join room" });
  }
});

router.delete("/room", authenticateOfficer, (req, res) => {
  const officerId = req.user.officer_id;
  const roomId = Number(req.body?.roomId);
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ error: "A valid room is required." });
  }

  db.query(
    "DELETE FROM room_member WHERE room_id = ? AND member_id = ?",
    [roomId, officerId],
    (err, result) => {
      if (err) {
        console.error("Officer leave room error:", err);
        return res.status(500).json({ error: "Unable to leave room" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Room membership not found" });
      }
      res.json({ message: "You left the room." });
    },
  );
});

router.get("/:id", authenticateOfficer, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT a.announcement_id, a.room_id, a.announcement_body, a.link,
           a.image, a.date_created
      FROM announcement a
      INNER JOIN room_member rm ON rm.room_id = a.room_id
     WHERE a.announcement_id = ? AND rm.member_id = ?
  `;
  db.query(sql, [id, req.user.officer_id], (err, results) => {
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

router.post(
  "/",
  authenticateOfficer,
  requireRoomMembership((req) => req.query.roomId || req.body?.room_id, ["officer"]),
  upload.single("file"),
  (req, res) => {
  const { announcement_body, link } = req.body;

  // Validate required fields
  if (!announcement_body || !announcement_body.trim()) {
    removeUploadedFile(req.file);
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
      req.roomId,
    ],
    (err, result) => {
      if (err) {
        removeUploadedFile(req.file);
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
  },
);

router.put(
  "/:id",
  authenticateOfficer,
  requireRoomMembership((req) => req.query.roomId || req.body?.room_id, ["officer"]),
  upload.single("file"),
  (req, res) => {
  const { id } = req.params;
  const { announcement_body, link, room_id } = req.body;

  // Validate required fields
  if (!announcement_body || !announcement_body.trim()) {
    removeUploadedFile(req.file);
    return res.status(400).json({ error: "Announcement body is required" });
  }

  const imageName = req.file ? req.file.filename : null;
  if (room_id && Number(room_id) !== req.roomId) {
    removeUploadedFile(req.file);
    return res.status(400).json({ error: "An announcement cannot be moved between rooms." });
  }

  const selectSql = `
    SELECT image FROM announcement
     WHERE announcement_id = ? AND room_id = ? LIMIT 1`;
  db.query(selectSql, [id, req.roomId], (lookupError, rows) => {
    if (lookupError) {
      removeUploadedFile(req.file);
      console.error("Announcement lookup error:", lookupError);
      return res.status(500).json({ error: "Unable to update announcement." });
    }
    if (!rows.length) {
      removeUploadedFile(req.file);
      return res.status(404).json({ error: "Announcement not found in this room." });
    }

    db.query(
      `UPDATE announcement
          SET announcement_body = ?, link = ?, image = COALESCE(?, image)
        WHERE announcement_id = ? AND room_id = ?`,
      [announcement_body.trim(), link?.trim() || null, imageName, id, req.roomId],
      (err) => {
        if (err) {
          removeUploadedFile(req.file);
          console.error("Announcement update error:", err);
          return res.status(500).json({ error: "Unable to update announcement." });
        }
        if (req.file && rows[0].image) {
          const oldImagePath = path.join(uploadDir, rows[0].image);
          fs.unlink(oldImagePath, (unlinkError) => {
            if (unlinkError && unlinkError.code !== "ENOENT") {
              console.error("Unable to remove replaced announcement image:", unlinkError);
            }
          });
        }
        res.json({ message: "Announcement updated successfully" });
      },
    );
  });
  },
);

router.delete(
  "/:id",
  authenticateOfficer,
  requireRoomMembership((req) => req.query.roomId, ["officer"]),
  (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT image FROM announcement WHERE announcement_id = ? AND room_id = ?",
    [id, req.roomId],
    (lookupError, results) => {
      if (lookupError) {
        console.error("Announcement lookup before deletion error:", lookupError);
        return res.status(500).json({ error: "Unable to delete announcement." });
      }
      if (!results.length) {
        return res.status(404).json({ error: "Announcement not found in this room." });
      }

      db.query(
        "DELETE FROM announcement WHERE announcement_id = ? AND room_id = ?",
        [id, req.roomId],
        (err, result) => {
          if (err) {
            console.error("Announcement deletion error:", err);
            return res.status(500).json({ error: "Unable to delete announcement." });
          }
          if (!result.affectedRows) {
            return res.status(404).json({ error: "Announcement not found in this room." });
          }
          if (results[0].image) {
            const imagePath = path.join(uploadDir, results[0].image);
            fs.unlink(imagePath, (unlinkError) => {
              if (unlinkError && unlinkError.code !== "ENOENT") {
                console.error("Unable to remove deleted announcement image:", unlinkError);
              }
            });
          }
          res.json({ message: "Announcement deleted successfully" });
        },
      );
    },
  );
  },
);

export default router;
