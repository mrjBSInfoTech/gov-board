import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";
import { requireOfficerGovernanceAccess } from "../../middleware/officerGovernanceAccess.js";
import { calculateContributionPerMember } from "../../utils/officer/budgetContributions.js";

const router = express.Router();
const statuses = ["Planned", "Ongoing", "Completed"];
const budgetColumns = `
  budget_id, room_id, budget_name, category, planned_amount, spent_amount,
  budget_period, DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline, description,
  status, created_by, created_at, updated_at,
  (SELECT COUNT(DISTINCT rm.member_id)
     FROM room_member rm
    WHERE rm.room_id = budgets.room_id) AS member_count,
  (SELECT f.fund_id FROM funds f
    WHERE f.budget_id = budgets.budget_id AND f.room_id = budgets.room_id
    LIMIT 1) AS fund_id,
  GREATEST(0.01, FLOOR(budgets.planned_amount * 100 / NULLIF(
    (SELECT COUNT(DISTINCT rm.member_id)
       FROM room_member rm
      WHERE rm.room_id = budgets.room_id), 0
  )) / 100) AS contribution_amount,
  COALESCE((SELECT SUM(fc.amount)
              FROM funds f
              INNER JOIN fund_contributions fc ON fc.fund_id = f.fund_id
             WHERE f.budget_id = budgets.budget_id
               AND f.room_id = budgets.room_id
               AND fc.review_status = 'Approved'), 0) AS total_collected
`;

const isValidId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const isValidAmount = (value) => {
  const amount = String(value ?? "").trim();
  return /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) <= 99999999.99;
};

const validateBudget = (budget) => {
  if (!budget?.budget_name?.trim()) return "Budget name is required";
  if (budget.budget_name.trim().length > 100) return "Budget name must be 100 characters or fewer";
  if (typeof budget.category !== "string" || !budget.category.trim() || budget.category.trim().length > 50) return "A valid category is required";
  if (!isValidAmount(budget.planned_amount) || Number(budget.planned_amount) <= 0) return "Enter a valid amount needed";
  if (budget.status && !statuses.includes(budget.status)) return "Invalid budget status";
  if (budget.description != null && typeof budget.description !== "string") return "Description must be text";
  if (budget.deadline != null && budget.deadline !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(budget.deadline))) return "Enter a valid deadline";
    const deadline = new Date(`${budget.deadline}T00:00:00Z`);
    if (Number.isNaN(deadline.getTime()) || deadline.toISOString().slice(0, 10) !== budget.deadline) return "Enter a valid deadline";
  }
  return null;
};

const checkOfficerRoom = (officerId, roomId, callback) => {
  db.query(
    `SELECT room_id FROM room_member
     WHERE room_id = ? AND member_type = 'officer' AND member_id = ? LIMIT 1`,
    [roomId, officerId],
    (err, rows) => callback(err, rows?.length > 0),
  );
};

const findOfficerBudget = (budgetId, officerId, callback) => {
  db.query(
    `SELECT ${budgetColumns}
     FROM budgets
     WHERE budget_id = ? AND EXISTS (
       SELECT 1 FROM room_member
       WHERE room_member.room_id = budgets.room_id
         AND member_type = 'officer' AND member_id = ?
     ) LIMIT 1`,
    [budgetId, officerId],
    (err, rows) => callback(err, rows?.[0] || null),
  );
};

const getRoomMemberCount = (roomId, callback) => {
  db.query(
    "SELECT COUNT(DISTINCT member_id) AS member_count FROM room_member WHERE room_id = ?",
    [roomId],
    (err, rows) => callback(err, Number(rows?.[0]?.member_count || 0)),
  );
};

const fundStatusForBudget = (status) => ({
  Planned: "Collecting",
  Ongoing: "Active",
  Completed: "Closed",
}[status || "Planned"]);

const syncBudgetFund = (budget, memberCount, callback) => {
  const contributionAmount = Math.max(
    0.01,
    calculateContributionPerMember(budget.planned_amount, memberCount),
  ).toFixed(2);
  const values = [
    budget.budget_name.trim(),
    budget.description?.trim() || null,
    budget.planned_amount,
    contributionAmount,
    budget.deadline || null,
    fundStatusForBudget(budget.status),
    budget.room_id,
    budget.budget_id,
  ];

  db.query(
    `UPDATE funds
        SET fund_name = ?, description = ?, target_amount = ?,
            contribution_amount = ?, deadline = ?, status = ?
      WHERE room_id = ? AND budget_id = ?`,
    values,
    (updateErr, result) => {
      if (updateErr) return callback(updateErr);
      if (result.affectedRows) return callback(null);
      db.query(
        "SELECT fund_id FROM funds WHERE room_id = ? AND budget_id = ? LIMIT 1",
        [budget.room_id, budget.budget_id],
        (findErr, rows) => {
          if (findErr) return callback(findErr);
          if (rows.length) return callback(null);
          db.query(
            `INSERT INTO funds
              (room_id, budget_id, fund_name, description, target_amount,
               contribution_amount, deadline, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              budget.room_id,
              budget.budget_id,
              budget.budget_name.trim(),
              budget.description?.trim() || null,
              budget.planned_amount,
              contributionAmount,
              budget.deadline || null,
              fundStatusForBudget(budget.status),
              budget.created_by || null,
            ],
            (insertErr) => callback(insertErr),
          );
        },
      );
    },
  );
};

router.get(
  "/",
  authenticateOfficer,
  requireOfficerGovernanceAccess({ section: "budget", getRoomId: (req) => req.query.roomId }),
  (req, res) => {
  const { roomId } = req.query;
  if (roomId && !isValidId(roomId)) return res.status(400).json({ error: "Invalid room ID" });

  const loadBudgets = () => {
    let sql = `SELECT ${budgetColumns}
               FROM budgets WHERE EXISTS (
                 SELECT 1 FROM room_member
                 WHERE room_member.room_id = budgets.room_id
                   AND member_type = 'officer' AND member_id = ?
               )`;
    const values = [req.user.officer_id];
    if (roomId) {
      sql += " AND room_id = ?";
      values.push(roomId);
    }
    sql += " ORDER BY created_at DESC, budget_id DESC";
    db.query(sql, values, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  };

  if (!roomId) return loadBudgets();
  checkOfficerRoom(req.user.officer_id, roomId, (err, isMember) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!isMember) return res.status(403).json({ error: "You are not an officer in this room" });
    loadBudgets();
  });
  },
);

router.post(
  "/",
  authenticateOfficer,
  requireOfficerGovernanceAccess({
    section: "budget",
    action: "manage",
    getRoomId: (req) => req.body?.room_id,
  }),
  (req, res) => {
  const { room_id, budget_name, category, planned_amount, deadline, description, status } = req.body;
  if (!isValidId(room_id)) return res.status(400).json({ error: "Invalid room ID" });
  const validationError = validateBudget(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  checkOfficerRoom(req.user.officer_id, room_id, (roomErr, isMember) => {
    if (roomErr) return res.status(500).json({ error: roomErr.message });
    if (!isMember) return res.status(403).json({ error: "You are not an officer in this room" });
    getRoomMemberCount(room_id, (countErr, memberCount) => {
      if (countErr) return res.status(500).json({ error: countErr.message });
      if (!memberCount) return res.status(400).json({ error: "This room has no members to calculate contributions for" });
      db.query(
        `INSERT INTO budgets
         (room_id, budget_name, category, planned_amount, spent_amount, budget_period, deadline, description, status, created_by)
         VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)`,
        [room_id, budget_name.trim(), category.trim(), planned_amount, deadline || null, description?.trim() || null, status || "Planned", req.user.officer_id],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          const budgetId = result.insertId;
          syncBudgetFund(
            { ...req.body, room_id, budget_id: budgetId, created_by: req.user.officer_id },
            memberCount,
            (fundErr) => {
              if (!fundErr) {
                req.auditInformation = `Added Budget "${budget_name.trim()}"`;
                return res.status(201).json({ message: "Budget added successfully", budget_id: budgetId });
              }
              db.query("DELETE FROM budgets WHERE budget_id = ? AND room_id = ?", [budgetId, room_id], (cleanupErr) => {
                if (cleanupErr) console.error("Unable to remove budget after collection-plan creation failed:", cleanupErr);
                return res.status(500).json({ error: fundErr.message });
              });
            },
          );
        },
      );
    });
  });
  },
);

router.put(
  "/:id",
  authenticateOfficer,
  requireOfficerGovernanceAccess({
    section: "budget",
    action: "manage",
    getRoomId: (req) => req.body?.room_id,
  }),
  (req, res) => {
  const { id } = req.params;
  const { room_id, budget_name, category, planned_amount, deadline, description, status } = req.body;
  if (!isValidId(id) || !isValidId(room_id)) return res.status(400).json({ error: "Invalid budget or room ID" });
  const validationError = validateBudget(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  checkOfficerRoom(req.user.officer_id, room_id, (roomErr, isMember) => {
    if (roomErr) return res.status(500).json({ error: roomErr.message });
    if (!isMember) return res.status(403).json({ error: "You are not an officer in this room" });
    getRoomMemberCount(room_id, (countErr, memberCount) => {
      if (countErr) return res.status(500).json({ error: countErr.message });
      if (!memberCount) return res.status(400).json({ error: "This room has no members to calculate contributions for" });
      db.query(
        `UPDATE budgets
            SET budget_name = ?, category = ?, planned_amount = ?, deadline = ?,
                description = ?, status = ?
          WHERE budget_id = ? AND room_id = ?`,
        [budget_name.trim(), category.trim(), planned_amount, deadline || null, description?.trim() || null, status || "Planned", id, room_id],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!result.affectedRows) return res.status(404).json({ error: "Budget not found in this room" });
          syncBudgetFund(
            { ...req.body, room_id, budget_id: Number(id) },
            memberCount,
            (fundErr) => {
              if (fundErr) return res.status(500).json({ error: fundErr.message });
              req.auditInformation = `Edited Budget "${budget_name.trim()}"`;
              res.json({ message: "Budget updated successfully" });
            },
          );
        },
      );
    });
  });
  },
);

router.delete(
  "/:id",
  authenticateOfficer,
  requireOfficerGovernanceAccess({
    section: "budget",
    action: "manage",
    getRoomId: (req) => req.query.roomId,
    resource: {
      table: "budgets",
      idParam: "id",
      idColumn: "budget_id",
      roomColumn: "room_id",
    },
  }),
  (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid budget ID" });

  findOfficerBudget(id, req.user.officer_id, (findErr, budget) => {
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!budget) return res.status(404).json({ error: "Budget not found" });
    req.auditRoomId = budget.room_id;
    db.query("DELETE FROM budgets WHERE budget_id = ? AND room_id = ?", [id, budget.room_id], (err, result) => {
      if (err) {
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
          return res.status(409).json({ error: "This budget has recorded contributions and cannot be deleted" });
        }
        return res.status(500).json({ error: err.message });
      }
      if (!result.affectedRows) return res.status(404).json({ error: "Budget not found" });
      req.auditInformation = `Deleted Budget "${budget.budget_name}"`;
      res.json({ message: "Budget deleted successfully" });
      },
    );
  });
});

export default router;
