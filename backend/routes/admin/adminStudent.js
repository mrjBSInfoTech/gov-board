import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

const POSITION_OPTIONS = [
  "Mayor",
  "Vice-Mayor",
  "Secretary",
  "Treasurer",
  "Auditor",
  "P.I.O.",
  "Protocol Officer",
];

router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT student_id, first_name, last_name, student_number, position, year, section, date_created
    FROM student
    ORDER BY date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(result);
  });
});

router.post("/:id/promote", authenticateAdmin, async (req, res) => {
  const studentId = Number(req.params.id);
  const { position, confirmReplace = false } = req.body;

  if (!studentId || !position) {
    return res
      .status(400)
      .json({ message: "Student and position are required." });
  }

  if (!POSITION_OPTIONS.includes(position)) {
    return res.status(400).json({ message: "Invalid position selected." });
  }

  try {
    const studentSql = `SELECT * FROM student WHERE student_id = ? LIMIT 1`;
    const [studentRows] = await db.promise().query(studentSql, [studentId]);

    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = studentRows[0];
    const duplicateSql = `
      SELECT *
      FROM officer o
      WHERE o.section = ? AND o.position = ?
      LIMIT 1
    `;

    const [duplicateRows] = await db
      .promise()
      .query(duplicateSql, [student.section, position]);

    if (duplicateRows && duplicateRows.length > 0 && !confirmReplace) {
      const previousHolder = duplicateRows[0];
      return res.status(409).json({
        message: `Are you sure you want to promote ${student.first_name} ${student.last_name} to ${position}? There are already someone assigned to the position. This will remove the previous position holder's authority.`,
        requiresConfirmation: true,
        duplicateHolder: {
          first_name: previousHolder.first_name,
          last_name: previousHolder.last_name,
          position: previousHolder.position,
          section: previousHolder.section,
        },
      });
    }

    const insertSql = `
      INSERT INTO officer (
        admin_id,
        student_number,
        position,
        year,
        section,
        first_name,
        last_name,
        password,
        date_created
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const connection = db.promise();
    await connection.beginTransaction();

    try {
      if (duplicateRows && duplicateRows.length > 0) {
        const previousHolder = duplicateRows[0];

        const restoreStudentSql = `
          INSERT INTO student (
            officer_id,
            room_id,
            first_name,
            last_name,
            student_number,
            position,
            year,
            section,
            password,
            date_created
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        await connection.query(restoreStudentSql, [
          null,
          null,
          previousHolder.first_name,
          previousHolder.last_name,
          previousHolder.student_number,
          null,
          previousHolder.year,
          previousHolder.section,
          previousHolder.password,
        ]);

        await connection.query(`DELETE FROM officer WHERE officer_id = ?`, [
          previousHolder.officer_id,
        ]);
      }

      const [insertResult] = await connection.query(insertSql, [
        req.user?.admin_id || null,
        student.student_number,
        position,
        student.year,
        student.section,
        student.first_name,
        student.last_name,
        student.password,
      ]);

      await connection.query(`DELETE FROM student WHERE student_id = ?`, [
        studentId,
      ]);

      await connection.commit();

      res.status(201).json({
        message: `${student.first_name} ${student.last_name} promoted to ${position}.`,
        officer_id: insertResult.insertId,
        requiresConfirmation: false,
      });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ message: "Database error" });
  }
});

router.delete("/:id", authenticateAdmin, (req, res) => {
  const student_id = req.params.id;
  const sql = `DELETE FROM student WHERE student_id = ?`;

  db.query(sql, [student_id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  });
});

export default router;
