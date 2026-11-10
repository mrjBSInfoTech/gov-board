import express from "express";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";
import { getRoomCollegeMemberVisibilityPredicate } from "../../utils/shared/calendarEventScope.js";
import { getAnnouncementImages } from "../../utils/shared/announcementImages.js";
import {
  createAnnouncementImageUpload,
  removeAnnouncementFiles,
  removeAnnouncementImageNames,
} from "../../utils/shared/announcementImageUpload.js";

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

const upload = createAnnouncementImageUpload(uploadDir);
const uploadAnnouncementImages = (req, res, next) => {
  upload.fields([{ name: "files" }, { name: "file", maxCount: 1 }])(
    req,
    res,
    (error) => {
      if (!error) return next();
      const tooLarge =
        error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
      return res.status(tooLarge ? 413 : 400).json({
        error: tooLarge
          ? "Each announcement image must be 10 MB or smaller."
          : error.message || "Unable to process announcement images.",
      });
    },
  );
};
const getUploadedAnnouncementFiles = (req) => [
  ...(req.files?.files || []),
  ...(req.files?.file || []),
];

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
    if (req.query.roomOnly === "true") {
      db.query(
        `SELECT announcement_id, room_id, announcement_body, link, image, images,
                date_created, 'room' AS source_type
           FROM announcement
          WHERE room_id = ?
          ORDER BY date_created DESC, announcement_id DESC`,
        [req.roomId],
        (err, results) => {
          if (err) {
            console.error("Room announcement list error:", err);
            return res.status(500).json({ error: "Unable to load announcements." });
          }
          return res.json(results);
        },
      );
      return;
    }

    const sql = `
    SELECT announcement_id, room_id, announcement_body, link, image, images, date_created,
           'room' AS source_type
      FROM announcement
     WHERE room_id = ?
    UNION ALL
    SELECT CONCAT('governance-', ga.announcement_id) AS announcement_id,
           ?, ga.announcement_body, ga.link, NULL AS image, ga.images,
           ga.date_created, 'governance' AS source_type
      FROM governance_announcement ga
      JOIN room r ON r.room_id = ?
      JOIN student s ON s.student_id = ?
     WHERE ga.visibility_scope = 'global'
        OR (
          ga.visibility_scope = 'college'
          AND ${getRoomCollegeMemberVisibilityPredicate("ga.college")}
        )
     ORDER BY date_created DESC, announcement_id DESC`;

    db.query(
      sql,
      [req.roomId, req.roomId, req.roomId, req.user.officer_id],
      (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Unable to load announcements." });
      }
      res.json(results);
      },
    );
  },
);

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
           a.image, a.images, a.date_created
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
  uploadAnnouncementImages,
  (req, res) => {
  const { announcement_body, link } = req.body;
  const uploadedFiles = getUploadedAnnouncementFiles(req);

  // Validate required fields
  if (!announcement_body || !announcement_body.trim()) {
    removeAnnouncementFiles(uploadedFiles);
    return res.status(400).json({ error: "Announcement body is required" });
  }

  const imageNames = uploadedFiles.map((file) => file.filename);
  const imageName = imageNames[0] || null;

  const sql = `
    INSERT INTO announcement 
    (announcement_body, link, image, images, room_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      announcement_body.trim(),
      link?.trim() || null,
      imageName,
      imageNames.length ? JSON.stringify(imageNames) : null,
      req.roomId,
    ],
    (err, result) => {
      if (err) {
        removeAnnouncementFiles(uploadedFiles);
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: "Announcement added successfully",
        id: result.insertId,
        image: imageName,
        images: imageNames,
      });
    }
  );
  },
);

router.put(
  "/:id",
  authenticateOfficer,
  requireRoomMembership((req) => req.query.roomId || req.body?.room_id, ["officer"]),
  uploadAnnouncementImages,
  (req, res) => {
  const { id } = req.params;
  const { announcement_body, link, room_id } = req.body;
  const uploadedFiles = getUploadedAnnouncementFiles(req);

  // Validate required fields
  if (!announcement_body || !announcement_body.trim()) {
    removeAnnouncementFiles(uploadedFiles);
    return res.status(400).json({ error: "Announcement body is required" });
  }

  if (room_id && Number(room_id) !== req.roomId) {
    removeAnnouncementFiles(uploadedFiles);
    return res.status(400).json({ error: "An announcement cannot be moved between rooms." });
  }

  const selectSql = `
    SELECT image, images FROM announcement
     WHERE announcement_id = ? AND room_id = ? LIMIT 1`;
  db.query(selectSql, [id, req.roomId], (lookupError, rows) => {
    if (lookupError) {
      removeAnnouncementFiles(uploadedFiles);
      console.error("Announcement lookup error:", lookupError);
      return res.status(500).json({ error: "Unable to update announcement." });
    }
    if (!rows.length) {
      removeAnnouncementFiles(uploadedFiles);
      return res.status(404).json({ error: "Announcement not found in this room." });
    }

    const imageNames = [
      ...new Set([
        ...getAnnouncementImages(rows[0].images, rows[0].image),
        ...uploadedFiles.map((file) => file.filename),
      ]),
    ];
    db.query(
      `UPDATE announcement
          SET announcement_body = ?, link = ?, image = ?, images = ?
        WHERE announcement_id = ? AND room_id = ?`,
      [
        announcement_body.trim(),
        link?.trim() || null,
        imageNames[0] || null,
        imageNames.length ? JSON.stringify(imageNames) : null,
        id,
        req.roomId,
      ],
      (err) => {
        if (err) {
          removeAnnouncementFiles(uploadedFiles);
          console.error("Announcement update error:", err);
          return res.status(500).json({ error: "Unable to update announcement." });
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
    "SELECT image, images FROM announcement WHERE announcement_id = ? AND room_id = ?",
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
          removeAnnouncementImageNames(
            uploadDir,
            getAnnouncementImages(results[0].images, results[0].image),
          );
          res.json({ message: "Announcement deleted successfully" });
        },
      );
    },
  );
  },
);

export default router;
