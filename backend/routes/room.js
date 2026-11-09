import express from "express";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import db from "../database/db.js";
import { isRoomMember } from "../utils/shared/roomMembership.js";
import { awardRoomXp } from "../utils/shared/roomLevelService.js";
import { getAdminRoomAccess } from "../utils/shared/adminRoomAccess.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatUploadDir = path.join(__dirname, "..", "uploads", "room-chat");
const allowedMediaExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".mp4",
  ".webm",
  ".mov",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
  ".rtf",
  ".txt",
  ".csv",
  ".zip",
]);
const getMediaExtension = (file) =>
  path.extname(file.originalname).toLowerCase();

fs.mkdirSync(chatUploadDir, { recursive: true });

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, chatUploadDir),
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${getMediaExtension(file)}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMediaExtensions.has(getMediaExtension(file))) {
      return callback(
        new Error("This file type is not supported in room chat."),
      );
    }
    callback(null, true);
  },
});

const uploadChatMedia = (req, res, next) => {
  chatUpload.single("media")(req, res, (error) => {
    if (!error) return next();
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      return res
        .status(413)
        .json({ error: "Media files must be 50 MB or smaller." });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: "Unable to process the uploaded file." });
    }
    return res.status(400).json({ error: error.message });
  });
};

const getRoomMediaUrl = (req, messageId) => {
  const mediaToken = jwt.sign(
    {
      room_id: req.roomId,
      message_id: Number(messageId),
      member_id: req.roomMemberId,
      member_type: req.roomMemberType,
    },
    process.env.JWT_SECRET || "your_secret_key",
    { expiresIn: "15m" },
  );
  return `/api/rooms/${req.roomId}/messages/${messageId}/media?token=${encodeURIComponent(mediaToken)}`;
};

const removeUploadedMedia = (file) => {
  if (!file) return;
  fs.unlink(file.path, (error) => {
    if (error) console.error("Unable to remove rejected chat upload:", error);
  });
};

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
        `SELECT EXISTS (
                  SELECT 1 FROM room_member
                   WHERE member_id = ? AND member_type = 'officer'
                ) AS has_officer_membership
           FROM student WHERE student_id = ? LIMIT 1`,
        [user.officer_id, user.officer_id],
        (roleError, rows) => {
          if (roleError) {
            console.error("Room account role verification error:", roleError);
            return res.status(500).json({ message: "Unable to verify account role." });
          }
          if (
            rows.length === 0 ||
            !rows[0].has_officer_membership
          ) {
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

const authorizeRoomMember = async (req, res, next) => {
  const roomId = Number(req.params.roomId);
  const adminId = Number(req.user.admin_id || 0);
  const memberId = Number(
    req.user.officer_id || req.user.student_id || req.user.id,
  );

  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ message: "A valid room and member are required." });
  }

  if (Number.isSafeInteger(adminId) && adminId > 0) {
    try {
      const adminRoomAccess = await getAdminRoomAccess(db, adminId, roomId);
      if (!adminRoomAccess) {
        return res.status(404).json({ message: "Room not found or inaccessible." });
      }

      req.roomId = roomId;
      req.roomMemberId = adminId;
      req.roomMemberType = "admin";
      req.isSuperAdmin = adminRoomAccess.isSuperAdmin;
      req.adminCollege = adminRoomAccess.college;
      return next();
    } catch (error) {
      console.error("Room existence check error:", error);
      return res.status(500).json({ message: "Unable to verify room." });
    }
  }

  if (!Number.isSafeInteger(memberId) || memberId < 1) {
    return res.status(400).json({ message: "A valid room and member are required." });
  }

  try {
    const [memberships] = await db.promise().query(
      `SELECT member_type, position
         FROM room_member
        WHERE room_id = ? AND member_id = ?
        LIMIT 1`,
      [roomId, memberId],
    );
    if (!memberships.length) {
      return res.status(403).json({ message: "You are not a member of this room." });
    }

    req.roomId = roomId;
    req.roomMemberId = memberId;
    req.roomMemberType = memberships[0].member_type;
    req.roomMemberPosition = memberships[0].position;
    return next();
  } catch (error) {
    console.error("Room membership verification error:", error);
    return res.status(500).json({ message: "Unable to verify room membership." });
  }
};

router.get(
  "/:roomId/members",
  authenticateRoomUser,
  authorizeRoomMember,
  (req, res) => {
    const collegeFilter =
      req.roomMemberType === "admin" && !req.isSuperAdmin
        ? " AND s.college = ?"
        : "";
    const params = req.isSuperAdmin || req.roomMemberType !== "admin"
      ? [req.roomId]
      : [req.roomId, req.adminCollege];
    db.query(
      `SELECT rm.member_id, s.first_name, s.last_name, rm.position,
        b.section_name AS section,
        rm.member_type
      FROM room_member rm
      INNER JOIN student s ON s.student_id = rm.member_id
      LEFT JOIN batch b ON b.batch_id = s.batch_id
      WHERE rm.room_id = ?${collegeFilter}
      ORDER BY first_name ASC, last_name ASC`,
      params,
      (err, results) => {
        if (err) {
          console.error("Room member read error:", err);
          return res.status(500).json({ error: "Unable to load room members" });
        }
        res.json(results);
      },
    );
  },
);

router.get("/my-room", authenticateRoomUser, (req, res) => {
  if (req.user.admin_id) {
    return res
      .status(403)
      .json({ message: "Admin accounts do not have a student room membership." });
  }

  const memberId = req.user.officer_id || req.user.student_id || req.user.id;
  const requestedRoomId = req.query.roomId ? Number(req.query.roomId) : null;

  if (!memberId) {
    return res.status(403).json({ message: "Unable to identify room member." });
  }
  if (
    requestedRoomId !== null &&
    (!Number.isSafeInteger(requestedRoomId) || requestedRoomId < 1)
  ) {
    return res.status(400).json({ message: "A valid roomId is required." });
  }

  db.query(
    `SELECT r.room_id, r.room_number, r.room_name, r.description, r.college, r.date_created,
            rm.member_type, rm.position
     FROM room_member rm
     INNER JOIN room r ON r.room_id = rm.room_id
     WHERE rm.member_id = ? AND (? IS NULL OR rm.room_id = ?)
     ORDER BY rm.date_joined DESC, rm.room_id DESC
     LIMIT 1`,
    [memberId, requestedRoomId, requestedRoomId],
    (err, results) => {
      if (err) {
        console.error("Current room lookup error:", err);
        return res.status(500).json({ message: "Unable to load current room" });
      }

      res.json(results[0] || null);
    },
  );
});

router.get("/my-rooms", authenticateRoomUser, (req, res) => {
  if (req.user.admin_id) {
    return res
      .status(403)
      .json({ message: "Admin accounts do not have student room memberships." });
  }
  const memberId = req.user.officer_id || req.user.student_id || req.user.id;
  if (!memberId) {
    return res.status(403).json({ message: "Unable to identify room member." });
  }

  db.query(
    `SELECT r.room_id, r.room_number, r.room_name, r.description, r.college, r.date_created,
            rm.member_type, rm.position, rm.date_joined
       FROM room_member rm
       INNER JOIN room r ON r.room_id = rm.room_id
      WHERE rm.member_id = ?
      ORDER BY rm.date_joined DESC, rm.room_id DESC`,
    [memberId],
    (err, rooms) => {
      if (err) {
        console.error("Room list lookup error:", err);
        return res.status(500).json({ message: "Unable to load your rooms." });
      }
      res.json(rooms);
    },
  );
});

router.get(
  "/:roomId/messages",
  authenticateRoomUser,
  authorizeRoomMember,
  (req, res) => {
    db.query(
      `SELECT message_id, room_id, sender_name, message,
              media_filename, media_name, media_type, date_created
       FROM room_message WHERE room_id = ? ORDER BY date_created ASC, message_id ASC`,
      [req.roomId],
      (err, results) => {
        if (err) {
          console.error("Room message read error:", err);
          return res.status(500).json({ error: "Unable to load room messages" });
        }
        res.json(
          results.map(({ media_filename, ...item }) => ({
            ...item,
            media_url: media_filename
              ? getRoomMediaUrl(req, item.message_id)
              : null,
          })),
        );
      },
    );
  },
);

router.get(
  "/:roomId/messages/:messageId/media",
  async (req, res) => {
    let mediaToken;
    try {
      mediaToken = jwt.verify(
        req.query.token,
        process.env.JWT_SECRET || "your_secret_key",
      );
    } catch {
      return res.status(403).json({ message: "Invalid or expired room media link." });
    }

    const roomId = Number(req.params.roomId);
    const messageId = Number(req.params.messageId);
    if (
      Number(mediaToken.room_id) !== roomId ||
      Number(mediaToken.message_id) !== messageId
    ) {
      return res.status(403).json({ message: "Invalid room media link." });
    }

    try {
      const memberId = Number(mediaToken.member_id);
      const memberType = mediaToken.member_type;
      const hasAccess =
        memberType === "admin"
          ? await getAdminRoomAccess(db, memberId, roomId)
          : ["officer", "student"].includes(memberType) &&
            (await isRoomMember(db, roomId, memberId, memberType));
      if (!hasAccess) {
        return res.status(403).json({ message: "You cannot access this room media." });
      }

      const [rows] = await db.promise().query(
        `SELECT media_filename
         FROM room_message
         WHERE room_id = ? AND message_id = ? AND media_filename IS NOT NULL
         LIMIT 1`,
        [roomId, messageId],
      );
      if (!rows.length) {
        return res.status(404).json({ message: "Room media not found." });
      }

      const filename = path.basename(rows[0].media_filename);
      if (filename !== rows[0].media_filename) {
        return res.status(404).json({ message: "Room media not found." });
      }

      res.set("Cache-Control", "private, no-store");
      res.sendFile(path.join(chatUploadDir, filename), (sendError) => {
        if (!sendError) return;
        console.error("Room media download error:", sendError);
        if (!res.headersSent) {
          res.status(sendError.statusCode === 404 ? 404 : 500).json({
            message:
              sendError.statusCode === 404
                ? "Room media not found."
                : "Unable to load room media.",
          });
        }
      });
    } catch (error) {
      console.error("Room media access error:", error);
      return res.status(500).json({ message: "Unable to load room media." });
    }
  },
);

router.post(
  "/:roomId/messages",
  authenticateRoomUser,
  authorizeRoomMember,
  uploadChatMedia,
  (req, res) => {
    const roomId = req.roomId;
    const message = req.body.message?.trim();
    const senderName = req.body.sender_name?.trim() || "Room member";
    const senderId = req.roomMemberId;
    const senderType = req.roomMemberType;
    if (!message && !req.file) {
      return res
        .status(400)
        .json({ error: "A message or media file is required." });
    }
    if (message && message.length > 2000) {
      removeUploadedMedia(req.file);
      return res.status(400).json({ error: "Message is too long" });
    }

    const extension = req.file ? getMediaExtension(req.file) : "";
    const mediaType = extension.match(/^\.(jpg|jpeg|png|gif|webp)$/)
      ? "image"
      : extension.match(/^\.(mp4|webm|mov)$/)
        ? "video"
        : req.file
          ? "file"
          : null;
    const mediaName = req.file
      ? path
          .basename(req.file.originalname.replace(/\\/g, "/"))
          .replace(/[\u0000-\u001f\u007f]/g, "")
          .slice(0, 255)
      : null;

    db.query(
      `INSERT INTO room_message
         (room_id, sender_id, sender_type, sender_name, message,
          media_filename, media_name, media_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        roomId,
        senderId,
        senderType,
        senderName,
        message || "",
        req.file?.filename || null,
        mediaName,
        mediaType,
      ],
      (err, result) => {
        if (err) {
          removeUploadedMedia(req.file);
          console.error("Room message write error:", err);
          return res.status(500).json({ error: "Unable to send room message" });
        }
        (async () => {
          try {
            if (senderType !== "admin") {
              await awardRoomXp(roomId, senderId, "chat");
            }
            res.status(201).json({
              message_id: result.insertId,
              room_id: roomId,
              sender_name: senderName,
              message: message || "",
              media_url: req.file
                ? getRoomMediaUrl(req, result.insertId)
                : null,
              media_name: mediaName,
              media_type: mediaType,
              date_created: new Date().toISOString(),
            });
          } catch (xpError) {
            console.error("Room chat quest XP award error:", xpError);
            res.status(500).json({
              error: "Message sent, but room quest XP could not be saved.",
            });
          }
        })();
      },
    );
  },
);

export default router;
