import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import db from "../../database/db.js";
import { authenticateBudgetContributor } from "../../middleware/budgetContributionAuthMiddleware.js";
import {
  createContributionProofUpload,
  MAX_CONTRIBUTION_PROOF_SIZE,
  removeContributionProof,
} from "../../utils/shared/contributionProofUpload.js";
import { getRemainingContribution } from "../../utils/officer/budgetContributionLimits.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const proofDir = path.resolve(__dirname, "..", "..", "private-uploads", "budget-contributions");
const upload = createContributionProofUpload(proofDir);
const methods = ["Cash", "GCash", "Bank Transfer", "Other"];
const isValidId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const isValidAmount = (value) =>
  /^\d+(\.\d{1,2})?$/.test(String(value ?? "").trim()) &&
  Number(value) > 0 &&
  Number(value) <= 99999999.99;

const uploadProof = (req, res, next) => {
  upload.single("proof")(req, res, (error) => {
    if (!error) return next();
    const tooLarge =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      error: tooLarge
        ? `Contribution proof images must be ${MAX_CONTRIBUTION_PROOF_SIZE / (1024 * 1024)} MB or smaller.`
        : error.message || "Unable to process the contribution proof image.",
    });
  });
};

const checkRoomMember = (memberId, roomId, callback) => {
  db.query(
    `SELECT 1 FROM room_member
      WHERE room_id = ? AND member_id = ?
        AND member_type IN ('student', 'officer')
      LIMIT 1`,
    [roomId, memberId],
    (error, rows) => callback(error, rows?.length > 0),
  );
};

router.get("/plans", authenticateBudgetContributor, (req, res) => {
  const { roomId } = req.query;
  if (!isValidId(roomId)) return res.status(400).json({ error: "A valid room ID is required." });

  checkRoomMember(req.user.member_id, roomId, (roomError, isMember) => {
    if (roomError) {
      console.error("Unable to verify room contributor membership:", roomError);
      return res.status(500).json({ error: "Unable to verify room membership." });
    }
    if (!isMember) return res.status(403).json({ error: "You are not a member of this room." });

    db.query(
      `SELECT f.fund_id, f.budget_id, f.room_id,
              b.budget_name, b.category, b.description, b.planned_amount,
              DATE_FORMAT(b.deadline, '%Y-%m-%d') AS deadline, b.status,
              f.target_amount,
              GREATEST(0.01, FLOOR(f.target_amount * 100 / NULLIF(
                (SELECT COUNT(DISTINCT rm.member_id)
                   FROM room_member rm
                  WHERE rm.room_id = f.room_id), 0
              )) / 100) AS contribution_amount,
              COALESCE((SELECT SUM(fc.amount)
                          FROM fund_contributions fc
                         WHERE fc.fund_id = f.fund_id
                           AND fc.review_status = 'Approved'), 0) AS total_collected,
              COALESCE((SELECT SUM(fc.amount)
                          FROM fund_contributions fc
                         WHERE fc.fund_id = f.fund_id
                           AND fc.review_status = 'Pending'), 0) AS total_pending,
              COALESCE((SELECT SUM(fc.amount)
                          FROM fund_contributions fc
                         WHERE fc.fund_id = f.fund_id
                           AND fc.student_id = ?
                           AND fc.review_status = 'Approved'), 0) AS my_approved_amount,
              COALESCE((SELECT SUM(fc.amount)
                          FROM fund_contributions fc
                         WHERE fc.fund_id = f.fund_id
                           AND fc.student_id = ?
                           AND fc.review_status = 'Pending'), 0) AS my_pending_amount,
              (SELECT fc.review_status
                 FROM fund_contributions fc
                WHERE fc.fund_id = f.fund_id AND fc.student_id = ?
                ORDER BY fc.contribution_id DESC LIMIT 1) AS my_latest_status,
              (SELECT fc.review_remarks
                 FROM fund_contributions fc
                WHERE fc.fund_id = f.fund_id AND fc.student_id = ?
                ORDER BY fc.contribution_id DESC LIMIT 1) AS my_latest_review_remarks
         FROM funds f
         INNER JOIN budgets b ON b.budget_id = f.budget_id
        WHERE f.room_id = ? AND b.room_id = ? AND f.status <> 'Closed'
        ORDER BY b.created_at DESC, b.budget_id DESC`,
      [
        req.user.member_id,
        req.user.member_id,
        req.user.member_id,
        req.user.member_id,
        roomId,
        roomId,
      ],
      (error, rows) => {
        if (error) {
          console.error("Unable to load room budget plans:", error);
          return res.status(500).json({ error: "Unable to load budget plans." });
        }
        res.json(rows);
      },
    );
  });
});

router.get("/:fundId/submissions", authenticateBudgetContributor, (req, res) => {
  const { fundId } = req.params;
  const { roomId } = req.query;
  if (!isValidId(fundId) || !isValidId(roomId)) {
    return res.status(400).json({ error: "A valid room and budget plan are required." });
  }

  db.query(
    `SELECT fc.contribution_id, fc.amount,
            DATE_FORMAT(fc.payment_date, '%Y-%m-%d') AS payment_date,
            fc.payment_method, fc.remarks, fc.review_status, fc.review_remarks,
            DATE_FORMAT(fc.reviewed_at, '%Y-%m-%d') AS reviewed_at
       FROM funds f
       INNER JOIN budgets b
         ON b.budget_id = f.budget_id AND b.room_id = f.room_id
       INNER JOIN room_member rm
         ON rm.room_id = f.room_id AND rm.member_id = ?
        AND rm.member_type IN ('student', 'officer')
       INNER JOIN fund_contributions fc
         ON fc.fund_id = f.fund_id AND fc.student_id = rm.member_id
      WHERE f.fund_id = ? AND f.room_id = ? AND f.budget_id IS NOT NULL
      ORDER BY fc.payment_date DESC, fc.contribution_id DESC`,
    [req.user.member_id, fundId, roomId],
    (error, rows) => {
      if (error) {
        console.error("Unable to load budget contribution history:", error);
        return res.status(500).json({ error: "Unable to load your contribution history." });
      }
      res.json(rows);
    },
  );
});

router.post("/:fundId/submissions", authenticateBudgetContributor, uploadProof, (req, res) => {
  const { fundId } = req.params;
  const { roomId, amount, payment_method, remarks } = req.body;
  const reject = (status, error) => {
    removeContributionProof(req.file);
    return res.status(status).json({ error });
  };

  if (!isValidId(fundId) || !isValidId(roomId)) {
    return reject(400, "A valid room and budget plan are required.");
  }
  if (!req.file) return res.status(400).json({ error: "Upload a proof image for this contribution." });
  if (!isValidAmount(amount)) return reject(400, "Enter a valid contribution amount.");
  if (!methods.includes(payment_method)) return reject(400, "Select a valid payment method.");
  if (remarks != null && typeof remarks !== "string") return reject(400, "Remarks must be text.");

  db.query(
    `SELECT f.fund_id, f.room_id, f.target_amount, f.status,
            GREATEST(0.01, FLOOR(f.target_amount * 100 / NULLIF(
              (SELECT COUNT(DISTINCT rm.member_id)
                 FROM room_member rm
                WHERE rm.room_id = f.room_id), 0
            )) / 100) AS contribution_amount,
            COALESCE((SELECT SUM(fc.amount)
                        FROM fund_contributions fc
                       WHERE fc.fund_id = f.fund_id
                         AND fc.review_status = 'Approved'), 0) AS total_approved,
            COALESCE((SELECT SUM(fc.amount)
                        FROM fund_contributions fc
                       WHERE fc.fund_id = f.fund_id
                         AND fc.review_status = 'Pending'), 0) AS total_pending,
            COALESCE((SELECT SUM(fc.amount)
                        FROM fund_contributions fc
                       WHERE fc.fund_id = f.fund_id
                         AND fc.student_id = ?
                         AND fc.review_status = 'Approved'), 0) AS member_approved,
            COALESCE((SELECT SUM(fc.amount)
                        FROM fund_contributions fc
                       WHERE fc.fund_id = f.fund_id
                         AND fc.student_id = ?
                         AND fc.review_status = 'Pending'), 0) AS member_pending,
            EXISTS (
              SELECT 1 FROM room_member rm
               WHERE rm.room_id = f.room_id AND rm.member_id = ?
                 AND rm.member_type IN ('student', 'officer')
            ) AS is_member
       FROM funds f
       INNER JOIN budgets b
         ON b.budget_id = f.budget_id AND b.room_id = f.room_id
      WHERE f.fund_id = ? AND f.room_id = ? AND f.budget_id IS NOT NULL
      LIMIT 1`,
    [
      req.user.member_id,
      req.user.member_id,
      req.user.member_id,
      fundId,
      roomId,
    ],
    (findError, rows) => {
      if (findError) {
        console.error("Unable to verify budget contribution:", findError);
        return reject(500, "Unable to verify this budget plan.");
      }
      const fund = rows[0];
      if (!fund || Number(fund.room_id) !== Number(roomId)) {
        return reject(404, "Budget plan not found in this room.");
      }
      if (!fund.is_member) return reject(403, "You are not a member of this room.");
      if (fund.status === "Closed") return reject(409, "This budget collection is closed.");

      const amountCents = Math.round(Number(amount) * 100);
      const remainingMember = getRemainingContribution(
        fund.contribution_amount,
        fund.member_approved,
        fund.member_pending,
      );
      const remainingPlan =
        Math.max(
          0,
          Math.round(Number(fund.target_amount) * 100) -
            Math.round(Number(fund.total_approved) * 100) -
            Math.round(Number(fund.total_pending) * 100),
        ) / 100;
      if (amountCents > Math.round(remainingMember * 100)) {
        return reject(400, `This submission exceeds your remaining contribution of ${remainingMember.toFixed(2)}.`);
      }
      if (amountCents > Math.round(remainingPlan * 100)) {
        return reject(400, `This submission exceeds the plan's remaining amount of ${remainingPlan.toFixed(2)}.`);
      }

      db.query(
        `INSERT INTO fund_contributions
          (fund_id, student_id, amount, payment_date, payment_method, remarks,
           review_status, proof_image)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 'Pending', ?)`,
        [
          fundId,
          req.user.member_id,
          amount,
          payment_method,
          remarks?.trim() || null,
          req.file.filename,
        ],
        (insertError, result) => {
          if (insertError) {
            console.error("Unable to save budget contribution:", insertError);
            return reject(500, "Unable to save your contribution submission.");
          }
          req.auditRoomId = Number(roomId);
          req.auditInformation = `Submitted a ${Number(amount).toFixed(2)} contribution for budget plan ${fund.budget_id}`;
          res.status(201).json({
            message: "Contribution submitted for officer verification.",
            contribution_id: result.insertId,
            review_status: "Pending",
          });
        },
      );
    },
  );
});

export default router;
