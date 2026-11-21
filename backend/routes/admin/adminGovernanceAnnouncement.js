import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { getAdminEventScope } from "../../utils/shared/calendarEventScope.js";
import { getAnnouncementImages } from "../../utils/shared/announcementImages.js";
import { getGovernanceAnnouncementDeleteScope } from "../../utils/admin/governanceAnnouncementScope.js";
import { notifyAnnouncementRecipients } from "../../utils/shared/announcementEmailService.js";
import {
  normalizeAnnouncementTitle,
  sanitizeAnnouncementHtml,
  stripAnnouncementHtml,
} from "../../utils/shared/announcementFormat.js";
import {
  createAnnouncementImageUpload,
  removeAnnouncementFiles,
  removeAnnouncementImageNames,
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

const getAdminSenderLabel = async (connection, user) => {
  const [rows] = await connection.query(
    "SELECT first_name, last_name FROM admin WHERE admin_id = ? LIMIT 1",
    [user.admin_id],
  );
  const fullName = rows[0]
    ? `${String(rows[0].first_name || "").trim()} ${String(rows[0].last_name || "").trim()}`.trim()
    : "";
  return fullName || user.username || user.position || "Admin";
};

router.get("/", authenticateAdmin, async (req, res) => {
  const visibilityFilter = req.user.is_super_admin
    ? ""
    : " AND (visibility_scope = 'global' OR (visibility_scope = 'college' AND college = ?))";
  const params = req.user.is_super_admin ? [] : [req.user.college];

  try {
    const [announcements] = await db.promise().query(
      `SELECT announcement_id, visibility_scope, college, title,
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
  const { title, error: titleError } = normalizeAnnouncementTitle(req.body.title);
  const sanitizedBody = sanitizeAnnouncementHtml(req.body.announcement_body);
  const plainBody = stripAnnouncementHtml(sanitizedBody);
  const link = typeof req.body.link === "string" ? req.body.link.trim() : "";

  if (titleError) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: titleError });
  }
  if (!plainBody) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: "Announcement text is required." });
  }
  if (sanitizedBody.length > 20000 || plainBody.length > 5000 || link.length > 255) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: "Announcement text or link is too long." });
  }

  const imageNames = (req.files || []).map((file) => file.filename);
  const { visibilityScope, college } = getAdminEventScope(req.user);
  try {
    const [result] = await db.promise().query(
      `INSERT INTO governance_announcement
        (visibility_scope, college, title, announcement_body, link, images, created_by_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        visibilityScope,
        college,
        title,
        sanitizedBody,
        link || null,
        imageNames.length ? JSON.stringify(imageNames) : null,
        req.user.admin_id,
      ],
    );
    req.auditTargetId = result.insertId;
    const [announcements] = await db.promise().query(
      `SELECT announcement_id, visibility_scope, college, title,
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

    void getAdminSenderLabel(db.promise(), req.user)
      .then((senderLabel) =>
        notifyAnnouncementRecipients(db.promise(), {
          scope: visibilityScope,
          college,
          title,
          senderLabel,
          announcementBody: sanitizedBody,
          link,
          images: imageNames,
          imageUploadDir: uploadDir,
        }),
      )
      .catch((emailError) => {
        console.error("Governance announcement email dispatch error:", emailError);
      });

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

router.put("/:id", authenticateAdmin, uploadAnnouncementImages, async (req, res) => {
  const announcementId = Number(req.params.id);
  if (!Number.isSafeInteger(announcementId) || announcementId < 1) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: "A valid announcement ID is required." });
  }

  const { title, error: titleError } = normalizeAnnouncementTitle(req.body.title);
  const sanitizedBody = sanitizeAnnouncementHtml(req.body.announcement_body);
  const plainBody = stripAnnouncementHtml(sanitizedBody);
  const link = typeof req.body.link === "string" ? req.body.link.trim() : "";
  const sendUpdateEmail =
    req.body.send_update_email === true || req.body.send_update_email === "true";

  if (titleError) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: titleError });
  }
  if (!plainBody) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: "Announcement text is required." });
  }
  if (sanitizedBody.length > 20000 || plainBody.length > 5000 || link.length > 255) {
    removeAnnouncementFiles(req.files);
    return res.status(400).json({ message: "Announcement text or link is too long." });
  }

  const scope = getGovernanceAnnouncementDeleteScope(req.user);
  try {
    const connection = db.promise();
    const [existing] = await connection.query(
      `SELECT visibility_scope, college, images
         FROM governance_announcement
        WHERE announcement_id = ?${scope.sql}
        LIMIT 1`,
      [announcementId, ...scope.params],
    );
    if (!existing.length) {
      removeAnnouncementFiles(req.files);
      return res.status(404).json({ message: "Announcement not found." });
    }

    const imageNames = [
      ...new Set([
        ...getAnnouncementImages(existing[0].images),
        ...(req.files || []).map((file) => file.filename),
      ]),
    ];

    await connection.query(
      `UPDATE governance_announcement
          SET title = ?, announcement_body = ?, link = ?, images = ?
        WHERE announcement_id = ?${scope.sql}`,
      [
        title,
        sanitizedBody,
        link || null,
        imageNames.length ? JSON.stringify(imageNames) : null,
        announcementId,
        ...scope.params,
      ],
    );

    const [updated] = await connection.query(
      `SELECT announcement_id, visibility_scope, college, title,
              announcement_body, link, images, date_created
         FROM governance_announcement
        WHERE announcement_id = ?`,
      [announcementId],
    );

    if (sendUpdateEmail) {
      void getAdminSenderLabel(db.promise(), req.user)
        .then((senderLabel) =>
          notifyAnnouncementRecipients(db.promise(), {
            scope: existing[0].visibility_scope,
            college: existing[0].college,
            title,
            senderLabel,
            announcementBody: sanitizedBody,
            link,
            images: imageNames,
            imageUploadDir: uploadDir,
            isUpdate: true,
          }),
        )
        .catch((emailError) => {
          console.error("Governance announcement update email dispatch error:", emailError);
        });
    }

    res.json({
      ...updated[0],
      images: getAnnouncementImages(updated[0].images),
    });
  } catch (error) {
    removeAnnouncementFiles(req.files);
    console.error("Governance announcement update error:", error);
    res.status(500).json({ message: "Unable to update governance announcement." });
  }
});

router.delete("/:id", authenticateAdmin, async (req, res) => {
  const announcementId = Number(req.params.id);
  if (!Number.isSafeInteger(announcementId) || announcementId < 1) {
    return res.status(400).json({ message: "A valid announcement ID is required." });
  }

  const scope = getGovernanceAnnouncementDeleteScope(req.user);
  try {
    const connection = db.promise();
    const [announcements] = await connection.query(
      `SELECT images
         FROM governance_announcement
        WHERE announcement_id = ?${scope.sql}
        LIMIT 1`,
      [announcementId, ...scope.params],
    );
    if (!announcements.length) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    const [result] = await connection.query(
      `DELETE FROM governance_announcement
        WHERE announcement_id = ?${scope.sql}`,
      [announcementId, ...scope.params],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    removeAnnouncementImageNames(
      uploadDir,
      getAnnouncementImages(announcements[0].images),
    );
    res.json({ message: "Announcement deleted successfully." });
  } catch (error) {
    console.error("Governance announcement deletion error:", error);
    res.status(500).json({ message: "Unable to delete governance announcement." });
  }
});

export default router;
