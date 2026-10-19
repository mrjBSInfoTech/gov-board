import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();
const statuses = ["Planned", "Ongoing", "Completed"];

const isValidId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const isValidAmount = (value) => {
  const amount = String(value ?? "").trim();
  return /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) <= 99999999.99;
};

const validateBudget = (budget) => {
  if (!budget?.budget_name?.trim()) return "Budget name is required";
  if (budget.budget_name.trim().length > 100) return "Budget name must be 100 characters or fewer";
  if (typeof budget.category !== "string" || !budget.category.trim() || budget.category.trim().length > 50) return "A valid category is required";
  if (!isValidAmount(budget.planned_amount) || !isValidAmount(budget.spent_amount)) return "Enter valid planned and spent amounts";
  if (budget.status && !statuses.includes(budget.status)) return "Invalid budget status";
  if (budget.budget_period != null && (typeof budget.budget_period !== "string" || budget.budget_period.length > 50)) return "Budget period must be 50 characters or fewer";
  if (budget.description != null && typeof budget.description !== "string") return "Description must be text";
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
    `SELECT budget_id, room_id, budget_name, category, planned_amount, spent_amount,
            budget_period, description, status, created_by, created_at, updated_at
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

router.get("/", authenticateOfficer, (req, res) => {
  const { roomId } = req.query;
  if (roomId && !isValidId(roomId)) return res.status(400).json({ error: "Invalid room ID" });

  const loadBudgets = () => {
    let sql = `SELECT budget_id, room_id, budget_name, category, planned_amount, spent_amount,
                      budget_period, description, status, created_by, created_at, updated_at
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
});

router.post("/", authenticateOfficer, (req, res) => {
  const { room_id, budget_name, category, planned_amount, spent_amount, budget_period, description, status } = req.body;
  if (!isValidId(room_id)) return res.status(400).json({ error: "Invalid room ID" });
  const validationError = validateBudget(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  checkOfficerRoom(req.user.officer_id, room_id, (roomErr, isMember) => {
    if (roomErr) return res.status(500).json({ error: roomErr.message });
    if (!isMember) return res.status(403).json({ error: "You are not an officer in this room" });
    db.query(
      `INSERT INTO budgets
       (room_id, budget_name, category, planned_amount, spent_amount, budget_period, description, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [room_id, budget_name.trim(), category.trim(), planned_amount, spent_amount, budget_period?.trim() || null, description?.trim() || null, status || "Planned", req.user.officer_id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        req.auditInformation = `Added Budget "${budget_name.trim()}"`;
        res.status(201).json({ message: "Budget added successfully", budget_id: result.insertId });
      },
    );
  });
});

router.put("/:id", authenticateOfficer, (req, res) => {
  const { id } = req.params;
  const { room_id, budget_name, category, planned_amount, spent_amount, budget_period, description, status } = req.body;
  if (!isValidId(id) || !isValidId(room_id)) return res.status(400).json({ error: "Invalid budget or room ID" });
  const validationError = validateBudget(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  checkOfficerRoom(req.user.officer_id, room_id, (roomErr, isMember) => {
    if (roomErr) return res.status(500).json({ error: roomErr.message });
    if (!isMember) return res.status(403).json({ error: "You are not an officer in this room" });
    db.query(
      `UPDATE budgets SET budget_name = ?, category = ?, planned_amount = ?, spent_amount = ?,
       budget_period = ?, description = ?, status = ? WHERE budget_id = ? AND room_id = ?`,
      [budget_name.trim(), category.trim(), planned_amount, spent_amount, budget_period?.trim() || null, description?.trim() || null, status || "Planned", id, room_id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!result.affectedRows) return res.status(404).json({ error: "Budget not found in this room" });
        req.auditInformation = `Edited Budget "${budget_name.trim()}"`;
        res.json({ message: "Budget updated successfully" });
      },
    );
  });
});

router.delete("/:id", authenticateOfficer, (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid budget ID" });

  findOfficerBudget(id, req.user.officer_id, (findErr, budget) => {
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!budget) return res.status(404).json({ error: "Budget not found" });
    db.query("DELETE FROM budgets WHERE budget_id = ? AND room_id = ?", [id, budget.room_id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!result.affectedRows) return res.status(404).json({ error: "Budget not found" });
      req.auditInformation = `Deleted Budget "${budget.budget_name}"`;
      res.json({ message: "Budget deleted successfully" });
    });
  });
});

export default router;
