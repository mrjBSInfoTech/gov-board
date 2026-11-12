import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { getAdminEventScope } from "../../utils/shared/calendarEventScope.js";
import { getAnnouncementImages } from "../../utils/shared/announcementImages.js";
import {
  createAnnouncementImageUpload,
  removeAnnouncementFiles,
} from "../../utils/shared/announcementImageUpload.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "admin",
  "governanceAnnouncement",
);
const upload = createAnnouncementImageUpload(uploadDir);
const uploadAnnouncementImages = (req, res, next) => {
  upload.array("files")(req, res, (error) => {
    if (!error) return next();
    const tooLarge =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge
        ? "Each announcement image must be 10 MB or smaller."
        : error.message || "Unable to process announcement images.",
    });
  });
};

router.get("/", authenticateAdmin, async (req, res) => {
  const visibilityFilter = req.user.is_super_admin
    ? ""
    : " AND (visibility_scope = 'global' OR (visibility_scope = 'college' AND college = ?))";
  const params = req.user.is_super_admin ? [] : [req.user.college];

  try {
    const [announcements] = await db.promise().query(
      `SELECT announcement_id, visibility_scope, college,
              announcement_body, link, images, date_created
         FROM governance_announcement
        WHERE 1 = 1${visibilityFilter}
        ORDER BY date_created DESC, announcement_id DESC`,
      params,
    );
    res.json(
      announcements.map((announcement) => ({
        ...announcement,
        images: getAnnouncementImages(announcement.images),
      })),
    );
  } catch (error) {
    console.error("Governance announcements query error:", error);
    res.status(500).json({ message: "Unable to load governance announcements." });
  }
});

router.post("/", authenticateAdmin, uploadAnnouncementImages, async (req, res) => {
  const announcementBody =
    typeof req.body.announcement_body === "string"
      ? req.body.announcement_body.trim()
      : "";
  const link = typeof req.body.link === "string" ? req.body.link.trim() : "";

  if (!announcementBody) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: "Announcement text is required." });
  }
  if (announcementBody.length > 5000 || link.length > 255) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: "Announcement text or link is too long." });
  }

  const imageNames = (req.files || []).map((file) => file.filename);
  const { visibilityScope, college } = getAdminEventScope(req.user);
  try {
    const [result] = await db.promise().query(
      `INSERT INTO governance_announcement
        (visibility_scope, college, announcement_body, link, images, created_by_admin)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        visibilityScope,
        college,
        announcementBody,
        link || null,
        imageNames.length ? JSON.stringify(imageNames) : null,
        req.user.admin_id,
      ],
    );
    req.auditTargetId = result.insertId;
    const [announcements] = await db.promise().query(
      `SELECT announcement_id, visibility_scope, college,
              announcement_body, link, images, date_created
         FROM governance_announcement
        WHERE announcement_id = ?`,
      [result.insertId],
    );
    if (!announcements.length) {
      return res.status(500).json({
        message: "Announcement was created but could not be loaded.",
      });
    }
    res.status(201).json({
      ...announcements[0],
      images: getAnnouncementImages(announcements[0].images),
    });
  } catch (error) {
    removeAnnouncementFiles(req.files);
    console.error("Governance announcement creation error:", error);
    res.status(500).json({ message: "Unable to create governance announcement." });
  }
});

export default router;
