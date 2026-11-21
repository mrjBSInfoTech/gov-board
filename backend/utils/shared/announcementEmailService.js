import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import {
  escapeHtml,
  formatAnnouncementBodyForEmailHtml,
  stripAnnouncementHtml,
} from "./announcementFormat.js";

const EMAIL_BATCH_SIZE = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeStudentEmail(value) {
  if (value == null) return { email: null };
  if (typeof value !== "string") {
    return { email: null, error: "Email must be text." };
  }
  const trimmed = value.trim();
  if (!trimmed) return { email: null };
  if (trimmed.length > 255 || !EMAIL_PATTERN.test(trimmed)) {
    return { email: null, error: "Enter a valid email address." };
  }
  return { email: trimmed.toLowerCase() };
}

export function isDuplicateEmailError(error) {
  return (
    error?.code === "ER_DUP_ENTRY" &&
    /uq_student_email|\bemail\b/i.test(error?.sqlMessage || "")
  );
}

const sanitizeLink = (value) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export function buildAnnouncementEmailAttachments({
  images = [],
  imageUploadDir = "",
}) {
  if (!imageUploadDir || !Array.isArray(images) || !images.length) {
    return [];
  }

  const attachments = [];
  for (const rawName of images) {
    if (typeof rawName !== "string" || !rawName.trim()) continue;
    const filename = rawName.trim();
    if (path.basename(filename) !== filename) continue;

    const filePath = path.join(imageUploadDir, filename);
    if (!fs.existsSync(filePath)) continue;

    attachments.push({
      filename,
      path: filePath,
      cid: `announcement-image-${attachments.length + 1}@govboard`,
    });
  }
  return attachments;
}

export function buildAnnouncementEmail({
  title = "",
  scopeLabel,
  senderLabel,
  announcementBody,
  link = "",
  isUpdate = false,
  attachments = [],
}) {
  const safeTitle = String(title ?? "").trim();
  const safeScope = String(scopeLabel || "GovBoard").trim();
  const safeSender = String(senderLabel || "GovBoard").trim();
  const plainBody = stripAnnouncementHtml(announcementBody);
  const resolvedLink = sanitizeLink(link);
  const updateTag = isUpdate ? "[Updated] " : "";
  const actionVerb = isUpdate ? "Updated" : "Posted";

  const subject = safeTitle
    ? `[EARIST] ${updateTag}${safeTitle}`
    : `[EARIST] ${updateTag}${safeScope} Announcement`;
  const subtitle = `${safeScope} - ${actionVerb} by ${safeSender}`;
  const textParts = [
    `${isUpdate ? "Updated: " : ""}${safeTitle || `${safeScope} Announcement`}`,
    subtitle,
    "",
    plainBody,
  ];
  if (resolvedLink) {
    textParts.push("", `Link: ${resolvedLink}`);
  }
  if (attachments.length) {
    textParts.push("", `[Attached images: ${attachments.length}]`);
  }

  const htmlHeading = safeTitle
    ? `<h2 style="margin:0 0 6px;color:#111827;">${isUpdate ? "[Updated] " : ""}${escapeHtml(safeTitle)}</h2><p style="margin:0 0 16px;color:#4b5563;font-size:14px;">${escapeHtml(subtitle)}</p>`
    : `<h2 style="margin:0 0 8px;color:#111827;">${isUpdate ? "Updated " : ""}${escapeHtml(safeScope)} Announcement</h2><p style="margin:0 0 16px;color:#4b5563;font-size:14px;">${escapeHtml(subtitle)}</p>`;
  const htmlLink = resolvedLink
    ? `<p style="margin-top:16px;"><a href="${escapeHtml(resolvedLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resolvedLink)}</a></p>`
    : "";
  const htmlImages = attachments.length
    ? `<div style="margin-top:16px;">${attachments
        .map(
          (attachment) =>
            `<img src="cid:${escapeHtml(attachment.cid)}" alt="Announcement attachment" style="display:block;max-width:100%;height:auto;border-radius:8px;margin-top:12px;" />`,
        )
        .join("")}</div>`
    : "";
  const htmlContent = [
    `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">`,
    htmlHeading,
    formatAnnouncementBodyForEmailHtml(announcementBody),
    htmlLink,
    htmlImages,
    `</div>`,
  ].join("");

  return {
    subject,
    textContent: textParts.join("\n"),
    htmlContent,
  };
}

export function deduplicateEmails(emails) {
  const unique = [];
  const seen = new Set();
  for (const raw of emails || []) {
    const { email } = normalizeStudentEmail(raw);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    unique.push(email);
  }
  return unique;
}

const createGmailTransporter = ({ user, pass }) =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

export async function sendAnnouncementEmailBatch({
  recipients,
  subject,
  textContent,
  htmlContent,
  attachments = [],
  transporter = null,
  createTransport = createGmailTransporter,
  env = process.env,
}) {
  const uniqueRecipients = deduplicateEmails(recipients);
  if (!uniqueRecipients.length) {
    return { sent: 0, skipped: true, reason: "no-recipients" };
  }

  const gmailUser = String(env.GMAIL_USER || "").trim();
  const gmailPass = String(env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "").trim();
  const senderName = String(env.GMAIL_SENDER_NAME || "GovBoard").trim();

  if (!gmailUser || !gmailPass) {
    console.warn(
      "Skipping Gmail announcement email: GMAIL_USER or GMAIL_APP_PASSWORD is not configured.",
    );
    return { sent: 0, skipped: true, reason: "missing-config" };
  }

  const mailTransporter =
    transporter || createTransport({ user: gmailUser, pass: gmailPass });
  const from = senderName ? `"${senderName.replace(/"/g, "")}" <${gmailUser}>` : gmailUser;

  let sent = 0;
  for (let index = 0; index < uniqueRecipients.length; index += EMAIL_BATCH_SIZE) {
    const batch = uniqueRecipients.slice(index, index + EMAIL_BATCH_SIZE);
    await mailTransporter.sendMail({
      from,
      to: gmailUser,
      bcc: batch,
      subject,
      text: textContent,
      html: htmlContent,
      ...(attachments.length ? { attachments } : {}),
    });
    sent += batch.length;
  }

  return { sent, skipped: false };
}

export async function getAnnouncementRecipientEmails(
  connection,
  { scope, college = null, roomId = null },
) {
  if (scope === "global") {
    const [rows] = await connection.query(
      `SELECT DISTINCT email
         FROM student
        WHERE email IS NOT NULL AND TRIM(email) <> ''`,
    );
    return rows.map((row) => row.email);
  }

  if (scope === "college") {
    if (!college || !String(college).trim()) return [];
    const [rows] = await connection.query(
      `SELECT DISTINCT email
         FROM student
        WHERE LOWER(TRIM(college)) = LOWER(TRIM(?))
          AND email IS NOT NULL AND TRIM(email) <> ''`,
      [String(college).trim()],
    );
    return rows.map((row) => row.email);
  }

  if (scope === "room") {
    const numericRoomId = Number(roomId);
    if (!Number.isSafeInteger(numericRoomId) || numericRoomId < 1) return [];
    const [rows] = await connection.query(
      `SELECT DISTINCT s.email
         FROM room_member rm
         INNER JOIN student s ON s.student_id = rm.member_id
        WHERE rm.room_id = ?
          AND s.email IS NOT NULL AND TRIM(s.email) <> ''`,
      [numericRoomId],
    );
    return rows.map((row) => row.email);
  }

  return [];
}

export async function notifyAnnouncementRecipients(
  connection,
  {
    scope,
    college = null,
    roomId = null,
    roomName = null,
    title = "",
    senderLabel = "EARIST",
    announcementBody,
    link = "",
    images = [],
    imageUploadDir = "",
    isUpdate = false,
    transporter = null,
    createTransport = createGmailTransporter,
    env = process.env,
  },
) {
  let resolvedScopeLabel = "EARIST";
  if (scope === "college") {
    resolvedScopeLabel = college ? String(college).trim() : "College";
  } else if (scope === "room") {
    let resolvedRoomName = roomName;
    if (!resolvedRoomName && roomId) {
      const [roomRows] = await connection.query(
        "SELECT room_name FROM room WHERE room_id = ? LIMIT 1",
        [Number(roomId)],
      );
      resolvedRoomName = roomRows[0]?.room_name || null;
    }
    resolvedScopeLabel = resolvedRoomName ? `${resolvedRoomName}` : "Room";
  }

  const recipients = await getAnnouncementRecipientEmails(connection, {
    scope,
    college,
    roomId,
  });

  const attachments = buildAnnouncementEmailAttachments({
    images,
    imageUploadDir,
  });

  const emailContent = buildAnnouncementEmail({
    title,
    scopeLabel: resolvedScopeLabel,
    senderLabel,
    announcementBody,
    link,
    isUpdate,
    attachments,
  });

  return sendAnnouncementEmailBatch({
    recipients,
    ...emailContent,
    attachments,
    transporter,
    createTransport,
    env,
  });
}
