import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildAnnouncementEmail,
  buildAnnouncementEmailAttachments,
  getAnnouncementRecipientEmails,
  isDuplicateEmailError,
  normalizeStudentEmail,
  notifyAnnouncementRecipients,
  sendAnnouncementEmailBatch,
} from "../utils/shared/announcementEmailService.js";
import {
  normalizeAnnouncementTitle,
  sanitizeAnnouncementHtml,
  stripAnnouncementHtml,
} from "../utils/shared/announcementFormat.js";

test("normalizeStudentEmail accepts empty values, trims, lowercases, and rejects invalid formats", () => {
  assert.deepEqual(normalizeStudentEmail(null), { email: null });
  assert.deepEqual(normalizeStudentEmail("   "), { email: null });
  assert.deepEqual(normalizeStudentEmail("  Student.One@University.EDU "), {
    email: "student.one@university.edu",
  });
  assert.equal(normalizeStudentEmail("not-an-email").error, "Enter a valid email address.");
  assert.equal(normalizeStudentEmail(123).error, "Email must be text.");
});

test("isDuplicateEmailError distinguishes email unique conflicts", () => {
  assert.equal(
    isDuplicateEmailError({
      code: "ER_DUP_ENTRY",
      sqlMessage: "Duplicate entry 'a@b.com' for key 'uq_student_email'",
    }),
    true,
  );
  assert.equal(
    isDuplicateEmailError({
      code: "ER_DUP_ENTRY",
      sqlMessage: "Duplicate entry '123' for key 'student_number'",
    }),
    false,
  );
});

test("buildAnnouncementEmail escapes HTML, supports custom title, and formats link safely", () => {
  const result = buildAnnouncementEmail({
    title: "Enrollment Advisory",
    scopeLabel: "EARIST",
    senderLabel: "John Doe",
    announcementBody: '<p>Hello <b>students</b> &amp; faculty!</p><script>alert(1)</script>',
    link: "example.com/events",
  });

  assert.equal(result.subject, "[EARIST] Enrollment Advisory");
  assert.match(result.htmlContent, /<h2[^>]*>Enrollment Advisory<\/h2>/);
  assert.match(result.htmlContent, /EARIST - Posted by John Doe/);
  assert.match(result.htmlContent, /<p>Hello <b>students<\/b> &amp; faculty!<\/p>/);
  assert.doesNotMatch(result.htmlContent, /<script>/);
  assert.match(result.htmlContent, /href="https:\/\/example\.com\/events"/);
  assert.match(result.textContent, /EARIST - Posted by John Doe/);
  assert.match(result.textContent, /Hello students & faculty!/);
  assert.match(result.textContent, /Link: https:\/\/example\.com\/events/);

  const updated = buildAnnouncementEmail({
    title: "Enrollment Advisory",
    scopeLabel: "CAS",
    senderLabel: "John Doe",
    announcementBody: "<p>Moved to Room 204.</p>",
    isUpdate: true,
  });
  assert.equal(updated.subject, "[EARIST] [Updated] Enrollment Advisory");
  assert.match(updated.htmlContent, /\[Updated\] Enrollment Advisory/);
  assert.match(updated.textContent, /CAS - Updated by John Doe/);
});

test("announcementFormat sanitizes unsafe markup, converts font tags, and validates titles", () => {
  assert.deepEqual(normalizeAnnouncementTitle("  Final Exam  "), { title: "Final Exam" });
  assert.deepEqual(normalizeAnnouncementTitle("   "), { title: null });
  assert.equal(normalizeAnnouncementTitle("a".repeat(201)).error, "Title must be 200 characters or fewer.");

  const sanitized = sanitizeAnnouncementHtml(
    '<p onclick="evil()"><font color="#dc2626" size="4">Important</font></p><span style="font-size: x-large">Headline</span><iframe src="x"></iframe>',
  );
  assert.equal(
    sanitized,
    '<p><span style="color: #dc2626; font-size: 20px">Important</span></p><span style="font-size: 24px">Headline</span>',
  );
  assert.equal(stripAnnouncementHtml("<ul><li>One</li><li>Two</li></ul>"), "• One\n• Two");
});

test("sendAnnouncementEmailBatch chunks recipients into BCC batches via Gmail SMTP transporter", async () => {
  const sentMessages = [];
  let authConfig = null;
  const createTransport = (config) => {
    authConfig = config;
    return {
      async sendMail(mail) {
        sentMessages.push(mail);
      },
    };
  };

  const recipients = Array.from({ length: 105 }, (_, i) => `s${i}@example.com`);
  recipients.push("S0@example.com", "invalid-email");

  const result = await sendAnnouncementEmailBatch({
    recipients,
    subject: "Test",
    textContent: "Body",
    htmlContent: "<p>Body</p>",
    createTransport,
    env: {
      GMAIL_USER: "sender@gmail.com",
      GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
      GMAIL_SENDER_NAME: "GovBoard",
    },
  });

  assert.deepEqual(result, { sent: 105, skipped: false });
  assert.deepEqual(authConfig, {
    user: "sender@gmail.com",
    pass: "abcdefghijklmnop",
  });
  assert.equal(sentMessages.length, 3);
  assert.equal(sentMessages[0].from, '"GovBoard" <sender@gmail.com>');
  assert.equal(sentMessages[0].to, "sender@gmail.com");
  assert.equal(sentMessages[0].bcc.length, 50);
  assert.equal(sentMessages[1].bcc.length, 50);
  assert.equal(sentMessages[2].bcc.length, 5);
});

test("getAnnouncementRecipientEmails queries global, college, and room scopes properly", async () => {
  const calls = [];
  const connection = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes("FROM room WHERE")) {
        return [[{ room_name: "BSIT 3A" }]];
      }
      return [[{ email: "student@example.com" }]];
    },
  };

  await getAnnouncementRecipientEmails(connection, { scope: "global" });
  assert.match(calls[0].sql, /FROM student/);
  assert.doesNotMatch(calls[0].sql, /college/);

  await getAnnouncementRecipientEmails(connection, { scope: "college", college: "CAS" });
  assert.match(calls[1].sql, /LOWER\(TRIM\(college\)\)/);
  assert.deepEqual(calls[1].params, ["CAS"]);

  const sentMails = [];
  const roomResult = await notifyAnnouncementRecipients(connection, {
    scope: "room",
    roomId: 5,
    senderLabel: "Mayor John Doe",
    announcementBody: "Class meeting tomorrow.",
    transporter: {
      async sendMail(mail) {
        sentMails.push(mail);
      },
    },
    env: {
      GMAIL_USER: "sender@gmail.com",
      GMAIL_APP_PASSWORD: "testpassword",
    },
  });

  assert.deepEqual(roomResult, { sent: 1, skipped: false });
  assert.match(calls[3].sql, /FROM room_member rm/);
  assert.deepEqual(calls[3].params, [5]);
  assert.equal(sentMails.length, 1);
  assert.equal(sentMails[0].subject, "[EARIST] BSIT 3A Announcement");
});

test("notifyAnnouncementRecipients attaches uploaded images inline via CID and skips unsafe or missing files", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gov-board-email-img-"));
  const imagePath = path.join(tempDir, "flyer.png");
  await fs.promises.writeFile(imagePath, Buffer.from([137, 80, 78, 71]));

  try {
    const attachments = buildAnnouncementEmailAttachments({
      images: ["flyer.png", "../secret.png", "missing.png"],
      imageUploadDir: tempDir,
    });
    assert.equal(attachments.length, 1);
    assert.equal(attachments[0].filename, "flyer.png");
    assert.equal(attachments[0].path, imagePath);
    assert.match(attachments[0].cid, /^announcement-image-1@govboard$/);

    const sentMails = [];
    const connection = {
      async query(sql) {
        if (sql.includes("FROM room WHERE")) return [[{ room_name: "BSIT 3A" }]];
        return [[{ email: "student@example.com" }]];
      },
    };

    await notifyAnnouncementRecipients(connection, {
      scope: "room",
      roomId: 5,
      title: "Event Flyer",
      senderLabel: "John Doe",
      announcementBody: "<p>See attached flyer.</p>",
      images: ["flyer.png"],
      imageUploadDir: tempDir,
      transporter: {
        async sendMail(mail) {
          sentMails.push(mail);
        },
      },
      env: {
        GMAIL_USER: "sender@gmail.com",
        GMAIL_APP_PASSWORD: "testpassword",
      },
    });

    assert.equal(sentMails.length, 1);
    assert.equal(sentMails[0].attachments.length, 1);
    assert.match(sentMails[0].html, /<img src="cid:announcement-image-1@govboard"/);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});
