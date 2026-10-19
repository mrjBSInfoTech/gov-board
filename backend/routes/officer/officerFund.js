import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();
const fundStatuses = ["Collecting", "Active", "Closed"];
const paymentMethods = ["Cash", "GCash", "Bank Transfer", "Other"];

const fundColumns = `
  fund_id,
  room_id,
  fund_name,
  description,
  target_amount,
  contribution_amount,
  DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline,
  status,
  created_by,
  created_at,
  COALESCE((SELECT SUM(fc.amount) FROM fund_contributions fc WHERE fc.fund_id = funds.fund_id), 0) AS total_contributed,
  (SELECT COUNT(DISTINCT fc.student_id) FROM fund_contributions fc WHERE fc.fund_id = funds.fund_id) AS contributor_count,
  CASE
    WHEN COALESCE((SELECT SUM(fc.amount) FROM fund_contributions fc WHERE fc.fund_id = funds.fund_id), 0) >= target_amount
      THEN 'Complete'
    ELSE 'Incomplete'
  END AS completion_status
`;

const isValidId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;

const isValidAmount = (value, allowZero = false) => {
  const amount = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return false;

  const number = Number(amount);
  return number >= (allowZero ? 0 : 0.01) && number <= 99999999.99;
};

const validateFund = (fund) => {
  if (!fund?.fund_name?.trim()) return "Fund name is required";
  if (fund.fund_name.trim().length > 100) {
    return "Fund name must be 100 characters or fewer";
  }
  if (!isValidAmount(fund.target_amount, true)) {
    return "Enter a valid target amount";
  }
  if (!isValidAmount(fund.contribution_amount)) {
    return "Enter a valid contribution amount";
  }
  if (fund.status && !fundStatuses.includes(fund.status)) {
    return "Invalid fund status";
  }
  return null;
};

const validateContribution = (contribution) => {
  if (!isValidId(contribution?.student_id)) return "Select a valid student";
  if (!isValidAmount(contribution?.amount)) return "Enter a valid contribution amount";
  if (!paymentMethods.includes(contribution?.payment_method)) return "Select a valid payment method";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(contribution?.payment_date || ""))) return "Select a valid payment date";
  const paymentDate = new Date(`${contribution.payment_date}T00:00:00Z`);
  if (Number.isNaN(paymentDate.getTime()) || paymentDate.toISOString().slice(0, 10) !== contribution.payment_date) return "Select a valid payment date";
  if (contribution.remarks != null && typeof contribution.remarks !== "string") return "Remarks must be text";
  return null;
};

// Check that the logged-in officer belongs to the selected room.
const checkOfficerRoom = (officerId, roomId, callback) => {
  const sql = `
    SELECT room_id
    FROM room_member
    WHERE room_id = ?
      AND member_type = 'officer'
      AND member_id = ?
    LIMIT 1
  `;

  db.query(sql, [roomId, officerId], (err, results) => {
    if (err) return callback(err);
    callback(null, results.length > 0);
  });
};

// Get a fund only when it belongs to one of the officer's rooms.
const findOfficerFund = (fundId, officerId, callback) => {
  const sql = `
    SELECT ${fundColumns}
    FROM funds
    WHERE fund_id = ?
      AND EXISTS (
        SELECT 1
        FROM room_member
        WHERE room_member.room_id = funds.room_id
          AND member_type = 'officer'
          AND member_id = ?
      )
    LIMIT 1
  `;

  db.query(sql, [fundId, officerId], (err, results) => {
    if (err) return callback(err);
    callback(null, results[0] || null);
  });
};

// Get all funds from the rooms joined by the logged-in officer.
router.get("/", authenticateOfficer, (req, res) => {
  const { roomId } = req.query;

  if (roomId && !isValidId(roomId)) {
    return res.status(400).json({ error: "Invalid room ID" });
  }

  const loadFunds = () => {
    let sql = `
      SELECT ${fundColumns}
      FROM funds
      WHERE EXISTS (
        SELECT 1
        FROM room_member
        WHERE room_member.room_id = funds.room_id
          AND member_type = 'officer'
          AND member_id = ?
      )
    `;
    const params = [req.user.officer_id];

    if (roomId) {
      sql += " AND room_id = ?";
      params.push(roomId);
    }

    sql += " ORDER BY created_at DESC, fund_id DESC";

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  };

  if (!roomId) return loadFunds();

  checkOfficerRoom(req.user.officer_id, roomId, (err, isMember) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (!isMember) {
      return res.status(403).json({ error: "You are not an officer in this room" });
    }
    loadFunds();
  });
});

// Get one fund by ID.
router.get("/:id", authenticateOfficer, (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid fund ID" });
  }

  findOfficerFund(id, req.user.officer_id, (err, fund) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (!fund) {
      return res.status(404).json({ error: "Fund not found" });
    }
    res.json(fund);
  });
});

// Add a new fund.
router.post("/", authenticateOfficer, (req, res) => {
  const {
    room_id,
    fund_name,
    description,
    target_amount,
    contribution_amount,
    deadline,
    status,
  } = req.body;

  if (!isValidId(room_id)) {
    return res.status(400).json({ error: "Invalid room ID" });
  }

  const validationError = validateFund(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  checkOfficerRoom(req.user.officer_id, room_id, (roomErr, isMember) => {
    if (roomErr) {
      console.error("DB Error:", roomErr);
      return res.status(500).json({ error: roomErr.message });
    }
    if (!isMember) {
      return res.status(403).json({ error: "You are not an officer in this room" });
    }

    const sql = `
      INSERT INTO funds
        (room_id, fund_name, description, target_amount,
         contribution_amount, deadline, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      room_id,
      fund_name.trim(),
      description?.trim() || null,
      target_amount,
      contribution_amount,
      deadline || null,
      status || "Collecting",
      req.user.officer_id,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }

      req.auditInformation = `Added Fund "${fund_name.trim()}"`;
      res.status(201).json({
        message: "Fund added successfully",
        fund_id: result.insertId,
      });
    });
  });
});

// Update a fund.
router.put("/:id", authenticateOfficer, (req, res) => {
  const { id } = req.params;
  const {
    room_id,
    fund_name,
    description,
    target_amount,
    contribution_amount,
    deadline,
    status,
  } = req.body;

  if (!isValidId(id) || !isValidId(room_id)) {
    return res.status(400).json({ error: "Invalid fund or room ID" });
  }

  const validationError = validateFund(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  checkOfficerRoom(req.user.officer_id, room_id, (roomErr, isMember) => {
    if (roomErr) {
      console.error("DB Error:", roomErr);
      return res.status(500).json({ error: roomErr.message });
    }
    if (!isMember) {
      return res.status(403).json({ error: "You are not an officer in this room" });
    }

    const sql = `
      UPDATE funds
      SET fund_name = ?,
          description = ?,
          target_amount = ?,
          contribution_amount = ?,
          deadline = ?,
          status = ?
      WHERE fund_id = ? AND room_id = ?
    `;
    const values = [
      fund_name.trim(),
      description?.trim() || null,
      target_amount,
      contribution_amount,
      deadline || null,
      status || "Collecting",
      id,
      room_id,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Fund not found in this room" });
      }

      req.auditInformation = `Edited Fund "${fund_name.trim()}"`;
      res.json({ message: "Fund updated successfully" });
    });
  });
});

// Get contribution records for a fund in the officer's room.
router.get("/:id/contributions", authenticateOfficer, (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid fund ID" });

  findOfficerFund(id, req.user.officer_id, (findErr, fund) => {
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!fund) return res.status(404).json({ error: "Fund not found" });

    db.query(
      `SELECT fc.contribution_id, fc.fund_id, fc.student_id, fc.amount,
              DATE_FORMAT(fc.payment_date, '%Y-%m-%d') AS payment_date,
              fc.payment_method, fc.remarks, fc.recorded_by,
              s.student_number, CONCAT(s.first_name, ' ', s.last_name) AS student_name,
              (SELECT COALESCE(SUM(student_fc.amount), 0)
                 FROM fund_contributions student_fc
                WHERE student_fc.fund_id = fc.fund_id
                  AND student_fc.student_id = fc.student_id) AS student_total,
              CASE
                WHEN (SELECT COALESCE(SUM(student_fc.amount), 0)
                        FROM fund_contributions student_fc
                       WHERE student_fc.fund_id = fc.fund_id
                         AND student_fc.student_id = fc.student_id) >= f.contribution_amount
                  THEN 'Paid'
                ELSE 'Partial'
              END AS payment_status
         FROM fund_contributions fc
         INNER JOIN funds f ON f.fund_id = fc.fund_id
         INNER JOIN student s ON s.student_id = fc.student_id
        WHERE fc.fund_id = ?
        ORDER BY fc.payment_date DESC, fc.contribution_id DESC`,
      [id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      },
    );
  });
});

// Record a student's contribution to a fund.
router.post("/:id/contributions", authenticateOfficer, (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid fund ID" });
  const validationError = validateContribution(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  findOfficerFund(id, req.user.officer_id, (findErr, fund) => {
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!fund) return res.status(404).json({ error: "Fund not found" });

    const remaining = Number(fund.target_amount) - Number(fund.total_contributed);
    if (remaining <= 0) return res.status(409).json({ error: "This fund is already complete" });
    if (Number(req.body.amount) > remaining) {
      return res.status(400).json({ error: `Contribution cannot exceed the remaining amount of ${remaining.toFixed(2)}` });
    }

    db.query(
      `SELECT rm.member_id,
              (SELECT COALESCE(SUM(fc.amount), 0)
                 FROM fund_contributions fc
                WHERE fc.fund_id = ? AND fc.student_id = rm.member_id) AS student_total
         FROM room_member rm
        WHERE rm.room_id = ? AND rm.member_type = 'student' AND rm.member_id = ? LIMIT 1`,
      [id, fund.room_id, req.body.student_id],
      (memberErr, members) => {
        if (memberErr) return res.status(500).json({ error: memberErr.message });
        if (!members.length) return res.status(400).json({ error: "The selected student is not in this room" });
        const studentRemaining = Number(fund.contribution_amount) - Number(members[0].student_total);
        if (studentRemaining <= 0) return res.status(409).json({ error: "This student has already paid the required contribution" });
        if (Number(req.body.amount) > studentRemaining) {
          return res.status(400).json({ error: `Contribution cannot exceed the student's remaining amount of ${studentRemaining.toFixed(2)}` });
        }

        db.query(
          `INSERT INTO fund_contributions
            (fund_id, student_id, amount, payment_date, payment_method, remarks, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, req.body.student_id, req.body.amount, `${req.body.payment_date} 00:00:00`, req.body.payment_method, req.body.remarks?.trim() || null, req.user.officer_id],
          (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            req.auditInformation = `Recorded a contribution for Fund "${fund.fund_name}"`;
            res.status(201).json({ message: "Contribution recorded successfully", contribution_id: result.insertId });
          },
        );
      },
    );
  });
});

// Delete a fund.
router.delete("/:id", authenticateOfficer, (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Invalid fund ID" });
  }

  findOfficerFund(id, req.user.officer_id, (findErr, fund) => {
    if (findErr) {
      console.error("DB Error:", findErr);
      return res.status(500).json({ error: findErr.message });
    }
    if (!fund) {
      return res.status(404).json({ error: "Fund not found" });
    }

    db.query(
      "DELETE FROM funds WHERE fund_id = ? AND room_id = ?",
      [id, fund.room_id],
      (err, result) => {
        if (err) {
          console.error("DB Error:", err);
          if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
              error: "This fund has related records and cannot be deleted",
            });
          }
          return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Fund not found" });
        }

        req.auditInformation = `Deleted Fund "${fund.fund_name}"`;
        res.json({ message: "Fund deleted successfully" });
      }
    );
  });
});

export default router;
