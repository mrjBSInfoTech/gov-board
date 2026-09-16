// Backup Code
{
  /*
import express from "express";
import bcrypt from "bcryptjs";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true"].includes(String(value).toLowerCase());

// Map role → default permissions
const rolePermissions = (role, values = {}) => {
  const r = String(role || "officer").toLowerCase();
  if (r === "officer") {
    return { can_add: 1, can_edit: 1, can_delete: 1, can_moderate: 0 };
  }
  if (r === "moderator") {
    return { can_add: 1, can_edit: 1, can_delete: 0, can_moderate: 1 };
  }
  if (r === "viewer") {
    return { can_add: 0, can_edit: 0, can_delete: 0, can_moderate: 0 };
  }
  // customize — use provided values
  return {
    can_add: toBoolean(values.can_add) ? 1 : 0,
    can_edit: toBoolean(values.can_edit) ? 1 : 0,
    can_delete: toBoolean(values.can_delete) ? 1 : 0,
    can_moderate: toBoolean(values.can_moderate) ? 1 : 0,
  };
};

// ─── GET all officer accounts (with roles) ──────────────────────────────────
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT o.officer_id, o.admin_id, o.student_number, o.position, o.year, o.section, o.first_name,
      o.last_name, o.date_created, r.officer_role_id, r.role,
      r.can_add, r.can_edit, r.can_delete, r.can_moderate
    FROM officer o
    LEFT JOIN officer_role r ON o.officer_id = r.officer_id
    ORDER BY o.date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(result);
  });
});

// ─── POST create new officer account ─────────────────────────────────
router.post("/", authenticateAdmin, async (req, res) => {
  const {
    student_number,
    position,
    year,
    section,
    first_name,
    last_name,
    password,
    role,
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !password ||
    !student_number ||
    !position ||
    !year ||
    !section
  ) {
    return res
      .status(400)
      .json({ message: "Please fill all the required fields" });
  }

  const permissions = rolePermissions(role, {
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = req.user.admin_id;

    const connection = db.promise();
    await connection.beginTransaction();
    try {
      const [officerResult] = await connection.query(
        `INSERT INTO officer (admin_id, student_number, position, year, section, first_name, last_name, password, date_created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          adminId,
          student_number.trim(),
          position.trim(),
          year.trim(),
          section.trim(),
          first_name.trim(),
          last_name.trim(),
          hashedPassword,
        ],
      );

      await connection.query(
        `INSERT INTO officer_role (officer_id, role, can_add, can_edit, can_delete, can_moderate)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          officerResult.insertId,
          role || "officer",
          permissions.can_add,
          permissions.can_edit,
          permissions.can_delete,
          permissions.can_moderate,
        ],
      );
      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    }

    res.status(201).json({ message: "Officer account created successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── PUT update officer account + role ──────────────────────────────────────
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    student_number,
    position,
    year,
    section,
    first_name,
    last_name,
    password,
    role,
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !student_number ||
    !position ||
    !year ||
    !section
  ) {
    return res
      .status(400)
      .json({ message: "Please fill all the required fields" });
  }

  try {
    const connection = db.promise();
    await connection.beginTransaction();
    try {
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      const updateSql = password
        ? `UPDATE officer SET student_number = ?, position = ?, year = ?, section = ?, first_name = ?, last_name = ?, password = ? WHERE officer_id = ?`
        : `UPDATE officer SET student_number = ?, position = ?, year = ?, section = ?, first_name = ?, last_name = ? WHERE officer_id = ?`;
      const updateParams = password
        ? [
            student_number.trim(),
            position.trim(),
            year.trim(),
            section.trim(),
            first_name.trim(),
            last_name.trim(),
            hashedPassword,
            id,
          ]
        : [
            student_number.trim(),
            position.trim(),
            year.trim(),
            section.trim(),
            first_name.trim(),
            last_name.trim(),
            id,
          ];
      const [officerResult] = await connection.query(updateSql, updateParams);

      if (officerResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Officer not found" });
      }

      const permissions = rolePermissions(role || "officer", {
        can_add,
        can_edit,
        can_delete,
        can_moderate,
      });
      const roleValues = [
        role || "officer",
        permissions.can_add,
        permissions.can_edit,
        permissions.can_delete,
        permissions.can_moderate,
        id,
      ];
      const [roleResult] = await connection.query(
        `UPDATE officer_role
         SET role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_moderate = ?
         WHERE officer_id = ?`,
        roleValues,
      );

      if (roleResult.affectedRows === 0) {
        await connection.query(
          `INSERT INTO officer_role (officer_id, role, can_add, can_edit, can_delete, can_moderate)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            role || "officer",
            permissions.can_add,
            permissions.can_edit,
            permissions.can_delete,
            permissions.can_moderate,
          ],
        );
      }
      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    }

    res.json({ message: "Officer account updated" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── DELETE officer account ──────────────────────────────────────────────────
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const connection = db.promise();
    await connection.beginTransaction();
    try {
      await connection.query("DELETE FROM officer_role WHERE officer_id = ?", [
        id,
      ]);
      const [officerResult] = await connection.query(
        "DELETE FROM officer WHERE officer_id = ?",
        [id],
      );
      await connection.commit();
      if (officerResult.affectedRows === 0) {
        return res.status(404).json({ message: "Officer not found" });
      }
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    }

    res.json({ message: "Officer account deleted successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
*/}

import express from "express";
import bcrypt from "bcryptjs";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true"].includes(String(value).toLowerCase());

// Map role → default permissions
const rolePermissions = (role, values = {}) => {
  const r = String(role || "officer").toLowerCase();
  if (r === "officer") {
    return { can_add: 1, can_edit: 1, can_delete: 1, can_moderate: 0 };
  }
  if (r === "moderator") {
    return { can_add: 1, can_edit: 1, can_delete: 0, can_moderate: 1 };
  }
  if (r === "viewer") {
    return { can_add: 0, can_edit: 0, can_delete: 0, can_moderate: 0 };
  }
  // customize — use provided values
  return {
    can_add: toBoolean(values.can_add) ? 1 : 0,
    can_edit: toBoolean(values.can_edit) ? 1 : 0,
    can_delete: toBoolean(values.can_delete) ? 1 : 0,
    can_moderate: toBoolean(values.can_moderate) ? 1 : 0,
  };
};

// ─── GET all officer accounts (with roles) ──────────────────────────────────
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      o.officer_id,
      o.admin_id,
      o.student_number,
      o.position,
      o.year,
      o.section,
      o.first_name,
      o.last_name,
      o.date_created,
      r.officer_role_id,
      r.role,
      r.can_add,
      r.can_edit,
      r.can_delete,
      r.can_moderate
    FROM officer o
    LEFT JOIN officer_role r ON o.officer_id = r.officer_id
    ORDER BY o.date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(result);
  });
});

// ─── POST create new officer account ─────────────────────────────────
router.post("/", authenticateAdmin, async (req, res) => {
  const {
    student_number,
    position,
    year,
    section,
    first_name,
    last_name,
    password,
    role,
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !password ||
    !student_number ||
    !position ||
    !year ||
    !section
  ) {
    return res.status(400).json({ message: "Please fill all the required fields" });
  }

  const permissions = rolePermissions(role, { can_add, can_edit, can_delete, can_moderate });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = req.user.admin_id;

    db.beginTransaction((err) => {
      if (err) return res.status(500).json({ message: "Transaction error" });

      // Insert officer
      const sqlOfficer = `
        INSERT INTO officer (admin_id, student_number, position, year, section, first_name, last_name, password, date_created)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

      db.query(
        sqlOfficer,
        [adminId, student_number.trim(), position.trim(), year, section.trim(), first_name.trim(), last_name.trim(), hashedPassword],
        (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("DB error:", err);
            res.status(500).json({ message: "Database error" });
          });
        }

        const officerId = result.insertId;

        // Insert officer_role
        const sqlRole = `
          INSERT INTO officer_role (officer_id, role, can_add, can_edit, can_delete, can_moderate)
          VALUES (?, ?, ?, ?, ?, ?)`;

        db.query(
          sqlRole,
          [officerId, role || "officer", permissions.can_add, permissions.can_edit, permissions.can_delete, permissions.can_moderate],
          (err) => {
            if (err) {
              return db.rollback(() => {
                console.error("DB error:", err);
                res.status(500).json({ message: "Database error" });
              });
            }

            db.commit((err) => {
              if (err) {
                return db.rollback(() => res.status(500).json({ message: "Commit error" }));
              }
              res.status(201).json({ message: "Officer account created sucessfully"});
            });
          }
        );
        },
      );
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── PUT update officer account + role ──────────────────────────────────────
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    student_number,
    position,
    year,
    section,
    first_name,
    last_name,
    password,
    role,
    can_add,
    can_edit,
    can_delete,
    can_moderate,
  } = req.body;

  if (!first_name || !last_name || !student_number || !position || !year || !section) {
    return res.status(400).json({ message: "Please fill all the required fields" });
  }

  try {
    db.beginTransaction(async (err) => {
      if (err) return res.status(500).json({ message: "Transaction error" });

      // Update officer
      let sqlOfficer, officerParams;
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        sqlOfficer = `UPDATE officer SET student_number = ?, position = ?, year = ?, section = ?, first_name = ?, last_name = ?, password = ? WHERE officer_id = ?`;
        officerParams = [student_number.trim(), position.trim(), year, section.trim(), first_name.trim(), last_name.trim(), hashedPassword, id];
      } else {
        sqlOfficer = `UPDATE officer SET student_number = ?, position = ?, year = ?, section = ?, first_name = ?, last_name = ? WHERE officer_id = ?`;
        officerParams = [student_number.trim(), position.trim(), year, section.trim(), first_name.trim(), last_name.trim(), id];
      }

      db.query(sqlOfficer, officerParams, (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("DB error:", err);
            res.status(500).json({ message: "Database error" });
          });
        }
        if (result.affectedRows === 0) {
          return db.rollback(() => res.status(404).json({ message: "Officer not found" }));
        }

        // Update the existing role row instead of creating duplicates.
        const permissions = rolePermissions(role || "officer", { can_add, can_edit, can_delete, can_moderate });
        const roleParams = [
          role || "officer",
          permissions.can_add,
          permissions.can_edit,
          permissions.can_delete,
          permissions.can_moderate,
          id,
        ];

        db.query(
          "SELECT officer_role_id FROM officer_role WHERE officer_id = ? LIMIT 1",
          [id],
          (err, roleRows) => {
            if (err) {
              return db.rollback(() => {
                console.error("DB error:", err);
                res.status(500).json({ message: "Database error" });
              });
            }

            const sqlRole = roleRows.length
              ? `UPDATE officer_role
                 SET role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_moderate = ?
                 WHERE officer_id = ?`
              : `INSERT INTO officer_role
                 (officer_id, role, can_add, can_edit, can_delete, can_moderate)
                 VALUES (?, ?, ?, ?, ?, ?)`;
            const sqlParams = roleRows.length
              ? roleParams
              : [id, ...roleParams.slice(0, -1)];

            db.query(sqlRole, sqlParams, (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error("DB error:", err);
                  res.status(500).json({ message: "Database error" });
                });
              }

              db.commit((err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: "Commit error" }));
                res.json({ message: "Officer account updated" });
              });
            });
          },
        );
      });
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── DELETE officer account ──────────────────────────────────────────────────
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  // officer_role will cascade if FK is set; otherwise delete manually first
  db.query("DELETE FROM officer_role WHERE officer_id = ?", [id], (err) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    db.query("DELETE FROM officer WHERE officer_id = ?", [id], (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Officer not found" });
      }
      res.json({ message: "Officer account deleted sucessfully" });
    });
  });
});

export default router;
