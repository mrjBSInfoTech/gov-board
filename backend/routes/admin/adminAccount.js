import express from "express";
import bcrypt from "bcryptjs";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

const resolveBatchId = async (connection, year, section) => {
  const normalizedYear = String(year ?? "").trim();
  const normalizedSection = String(section ?? "").trim();

  if (!normalizedYear || !normalizedSection) {
    return null;
  }

  const [existingRows] = await connection.query(
    "SELECT batch_id FROM batch WHERE year_name = ? AND section_name = ? LIMIT 1",
    [normalizedYear, normalizedSection],
  );

  if (existingRows && existingRows.length > 0) {
    return existingRows[0].batch_id;
  }

  const [result] = await connection.query(
    "INSERT INTO batch (year_name, section_name) VALUES (?, ?)",
    [normalizedYear, normalizedSection],
  );

  return result.insertId;
};

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true"].includes(String(value).toLowerCase());

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

  return {
    can_add: toBoolean(values.can_add) ? 1 : 0,
    can_edit: toBoolean(values.can_edit) ? 1 : 0,
    can_delete: toBoolean(values.can_delete) ? 1 : 0,
    can_moderate: toBoolean(values.can_moderate) ? 1 : 0,
  };
};

router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      o.officer_id,
      o.admin_id,
      o.student_number,
      o.position,
      b.year_name AS year,
      b.section_name AS section,
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
    LEFT JOIN batch b ON b.batch_id = o.batch_id
    ORDER BY o.date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(result);
  });
});

router.post("/:id/demote", authenticateAdmin, async (req, res) => {
  const officerId = Number(req.params.id);

  if (!officerId) {
    return res.status(400).json({ message: "Officer ID is required." });
  }

  try {
    const connection = db.promise();
    await connection.beginTransaction();

    const [officerRows] = await connection.query(
      `SELECT o.*, b.year_name AS year, b.section_name AS section
       FROM officer o
       LEFT JOIN batch b ON b.batch_id = o.batch_id
       WHERE o.officer_id = ? LIMIT 1`,
      [officerId],
    );

    if (!officerRows || officerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Officer not found" });
    }

    const officer = officerRows[0];

    await connection.query(
      `INSERT INTO student (
        officer_id,
        room_id,
        first_name,
        last_name,
        student_number,
        position,
        batch_id,
        password,
        date_created
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        null,
        null,
        officer.first_name,
        officer.last_name,
        officer.student_number,
        null,
        officer.batch_id,
        officer.password,
      ],
    );

    await connection.query("DELETE FROM officer_role WHERE officer_id = ?", [
      officerId,
    ]);

    await connection.query("DELETE FROM officer WHERE officer_id = ?", [
      officerId,
    ]);

    await connection.commit();

    res.json({
      message: `${officer.first_name} ${officer.last_name} was demoted to student successfully.`,
    });
  } catch (error) {
    console.error("DB error:", error);
    try {
      const connection = db.promise();
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }
    res.status(500).json({ message: "Database error" });
  }
});

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
    const connection = db.promise();
    await connection.beginTransaction();

    const batchId = await resolveBatchId(connection, year, section);
    const [officerResult] = await connection.query(
      `INSERT INTO officer (admin_id, student_number, position, batch_id, first_name, last_name, password, date_created)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.admin_id,
        student_number.trim(),
        position.trim(),
        batchId,
        first_name.trim(),
        last_name.trim(),
        await bcrypt.hash(password, 10),
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

    res.status(201).json({ message: "Officer account created successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

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

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const batchId = await resolveBatchId(connection, year, section);

    const updateSql = password
      ? `UPDATE officer SET student_number = ?, position = ?, batch_id = ?, first_name = ?, last_name = ?, password = ? WHERE officer_id = ?`
      : `UPDATE officer SET student_number = ?, position = ?, batch_id = ?, first_name = ?, last_name = ? WHERE officer_id = ?`;

    const updateParams = password
      ? [
          student_number.trim(),
          position.trim(),
          batchId,
          first_name.trim(),
          last_name.trim(),
          hashedPassword,
          id,
        ]
      : [
          student_number.trim(),
          position.trim(),
          batchId,
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

    const [existingRoleRows] = await connection.query(
      "SELECT officer_role_id FROM officer_role WHERE officer_id = ? LIMIT 1",
      [id],
    );

    if (existingRoleRows.length > 0) {
      await connection.query(
        `UPDATE officer_role
         SET role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_moderate = ?
         WHERE officer_id = ?`,
        [
          role || "officer",
          permissions.can_add,
          permissions.can_edit,
          permissions.can_delete,
          permissions.can_moderate,
          id,
        ],
      );
    } else {
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
    res.json({ message: "Officer account updated" });
  } catch (err) {
    console.error("Error:", err);
    try {
      const connection = db.promise();
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const connection = db.promise();
    await connection.beginTransaction();

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

    res.json({ message: "Officer account deleted successfully" });
  } catch (err) {
    console.error("Error:", err);
    try {
      const connection = db.promise();
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
