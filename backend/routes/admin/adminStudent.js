import express from "express";
import bcrypt from "bcryptjs";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import {
  getAdminCollegeFilter,
  getAdminRoomCollegeFilter,
  resolveAdminCollege,
} from "../../utils/shared/adminScope.js";
import {
  canAssignStudentPosition,
  canDeleteStudent,
  canEditStudentDetails,
} from "../../utils/shared/adminPermissions.js";
import {
  isDuplicateEmailError,
  normalizeStudentEmail,
} from "../../utils/shared/announcementEmailService.js";

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
  const collegeFilter = getAdminCollegeFilter(req, "s.college");
  const sql = `
    SELECT s.student_id, s.first_name, s.last_name, s.student_number, s.email, s.position,
      s.college, s.course,
      b.year_name AS year, b.section_name AS section, s.date_created
    FROM student s
    LEFT JOIN batch b ON b.batch_id = s.batch_id
    WHERE s.role IS NULL${collegeFilter.sql}
    ORDER BY s.date_created DESC`;

  db.query(sql, collegeFilter.params, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(result);
  });
});

router.put("/:id", authenticateAdmin, async (req, res) => {
  if (!canEditStudentDetails(req.user)) {
    return res.status(403).json({
      message: "You do not have permission to edit student details.",
    });
  }
  const studentId = Number(req.params.id);
  const {
    first_name,
    last_name,
    student_number,
    email: rawEmail,
    college: requestedCollege,
    course: requestedCourse,
    year,
    section,
    password,
  } = req.body;
  const college = resolveAdminCollege(req, requestedCollege);
  const course = typeof requestedCourse === "string" ? requestedCourse.trim() : "";
  const { email, error: emailError } = normalizeStudentEmail(rawEmail);
  if (requestedCourse != null && typeof requestedCourse !== "string") {
    return res.status(400).json({ message: "Course must be text." });
  }
  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  if (!college && !req.user.is_super_admin) {
    return res.status(403).json({ message: "You can only manage your college." });
  }
  if (
    !studentId ||
    !first_name?.trim() ||
    !last_name?.trim() ||
    !student_number?.trim() ||
    !college ||
    !year?.trim() ||
    !section?.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Please fill all the required fields" });
  }
  if (course.length > 150) {
    return res.status(400).json({ message: "Course must be 150 characters or fewer." });
  }

  try {
    const connection = db.promise();
    await connection.beginTransaction();
    const batchId = await resolveBatchId(connection, year, section);
    const values = [
      first_name.trim(),
      last_name.trim(),
      student_number.trim(),
      email,
      college,
      course || null,
      batchId,
    ];
    let updateSql =
      "UPDATE student SET first_name = ?, last_name = ?, student_number = ?, email = ?, college = ?, course = ?, batch_id = ?";

    if (password) {
      if (password.length < 6) {
        await connection.rollback();
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters." });
      }
      updateSql += ", password = ?";
      values.push(await bcrypt.hash(password, 10));
    }

    values.push(studentId);
    const collegeFilter = getAdminCollegeFilter(req, "college");
    const [result] = await connection.query(
      `${updateSql} WHERE student_id = ?${collegeFilter.sql}`,
      [...values, ...collegeFilter.params],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Student not found" });
    }

    await connection.commit();
    return res.json({ message: "Student account updated successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: isDuplicateEmailError(error)
          ? "Email address is already in use."
          : "Student number already exists.",
      });
    }
    console.error("DB error:", error);
    return res.status(500).json({ message: "Database error" });
  }
});

router.post("/:id/promote", authenticateAdmin, async (req, res) => {
  if (!canAssignStudentPosition(req.user)) {
    return res.status(403).json({ message: "You cannot assign student positions." });
  }
  const studentId = Number(req.params.id);
  const { position, confirmReplace = false, roomId: requestedRoomId } = req.body;
  const roomId = requestedRoomId == null ? null : Number(requestedRoomId);

  if (!studentId || !position) {
    return res
      .status(400)
      .json({ message: "Student and position are required." });
  }

  if (!POSITION_OPTIONS.includes(position)) {
    return res.status(400).json({ message: "Invalid position selected." });
  }

  if (requestedRoomId != null) {
    if (!Number.isSafeInteger(roomId) || roomId < 1) {
      return res.status(400).json({ message: "A valid room is required." });
    }

    const connection = db.promise();
    const studentFilter = getAdminCollegeFilter(req, "s.college");
    const roomFilter = getAdminRoomCollegeFilter(req, "r.college");
    try {
      await connection.beginTransaction();
      const [[student]] = await connection.query(
        `SELECT s.student_id, s.first_name, s.last_name, rm.position
           FROM student s
           INNER JOIN room_member rm ON rm.member_id = s.student_id
           INNER JOIN room r ON r.room_id = rm.room_id
          WHERE s.student_id = ? AND rm.room_id = ?
            AND rm.member_type = 'student'${studentFilter.sql}${roomFilter.sql}
          LIMIT 1 FOR UPDATE`,
        [studentId, roomId, ...studentFilter.params, ...roomFilter.params],
      );
      if (!student) {
        await connection.rollback();
        return res.status(404).json({ message: "Student is not in this room." });
      }

      const [duplicates] = await connection.query(
        `SELECT s.student_id, s.first_name, s.last_name
           FROM room_member rm
           INNER JOIN student s ON s.student_id = rm.member_id
          WHERE rm.room_id = ? AND rm.member_type = 'officer'
            AND rm.position = ? AND rm.member_id <> ?
          LIMIT 1 FOR UPDATE`,
        [roomId, position, studentId],
      );
      if (duplicates.length && !confirmReplace) {
        await connection.rollback();
        return res.status(409).json({
          message: `There is already a ${position} in this room. Confirm to replace that officer.`,
          requiresConfirmation: true,
        });
      }
      if (duplicates.length) {
        await connection.query(
          `UPDATE room_member
              SET member_type = 'student', position = 'Student'
            WHERE room_id = ? AND member_id = ? AND member_type = 'officer'`,
          [roomId, duplicates[0].student_id],
        );
      }
      await connection.query(
        `UPDATE room_member
            SET member_type = 'officer', position = ?
          WHERE room_id = ? AND member_id = ? AND member_type = 'student'`,
        [position, roomId, studentId],
      );
      await connection.query(
        `UPDATE student
            SET can_add = IF(role IS NULL, 1, can_add),
                can_edit = IF(role IS NULL, 1, can_edit),
                can_delete = IF(role IS NULL, 1, can_delete),
                can_moderate = IF(role IS NULL, 0, can_moderate),
                role = COALESCE(role, 'officer')
          WHERE student_id = ?`,
        [studentId],
      );
      await connection.commit();
      return res.status(201).json({
        message: `${student.first_name} ${student.last_name} promoted to ${position} in this room.`,
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Room promotion rollback error:", rollbackError);
      }
      console.error("Room promotion error:", error);
      return res.status(500).json({ message: "Unable to promote room member." });
    }
  }

  try {
    const studentFilter = getAdminCollegeFilter(req, "s.college");
    const studentUpdateFilter = getAdminCollegeFilter(req, "college");
    const studentSql = `
      SELECT s.*, b.year_name AS year, b.section_name AS section
      FROM student s
      LEFT JOIN batch b ON b.batch_id = s.batch_id
      WHERE s.student_id = ?${studentFilter.sql} LIMIT 1`;
    const [studentRows] = await db
      .promise()
      .query(studentSql, [studentId, ...studentFilter.params]);

    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = studentRows[0];
    const duplicateFilter = getAdminCollegeFilter(req, "s.college");
    const duplicateSql = `
      SELECT s.*, b.year_name AS year, b.section_name AS section
      FROM student s
      LEFT JOIN batch b ON b.batch_id = s.batch_id
      WHERE b.year_name = ? AND b.section_name = ? AND s.position = ? AND s.role IS NOT NULL
        AND s.college <=> ?${duplicateFilter.sql}
      LIMIT 1
    `;

    const [duplicateRows] = await db
      .promise()
      .query(duplicateSql, [
        student.year,
        student.section,
        position,
        student.college,
        ...duplicateFilter.params,
      ]);

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

    const connection = db.promise();
    await connection.beginTransaction();

    try {
      if (duplicateRows && duplicateRows.length > 0) {
        const previousHolder = duplicateRows[0];

        await connection.query(
          `UPDATE student
           SET position = 'Student', role = NULL,
               can_add = 0, can_edit = 0, can_delete = 0, can_moderate = 0
           WHERE student_id = ?${studentUpdateFilter.sql}`,
          [previousHolder.student_id, ...studentUpdateFilter.params],
        );
      }

      const batchId = await resolveBatchId(
        connection,
        student.year,
        student.section,
      );
      await connection.query(
        `UPDATE student
         SET admin_id = ?, position = ?, batch_id = ?, role = 'officer',
             can_add = 1, can_edit = 1, can_delete = 1, can_moderate = 0
         WHERE student_id = ?${studentUpdateFilter.sql}`,
        [
          req.user?.admin_id || null,
          position,
          batchId,
          studentId,
          ...studentUpdateFilter.params,
        ],
      );

      await connection.commit();

      res.status(201).json({
        message: `${student.first_name} ${student.last_name} promoted to ${position}.`,
        officer_id: studentId,
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
  if (!canDeleteStudent(req.user)) {
    return res.status(403).json({
      message: "Only the College Head or Super Admin can delete students.",
    });
  }
  const student_id = req.params.id;
  const collegeFilter = getAdminCollegeFilter(req, "college");
  const sql = `DELETE FROM student WHERE student_id = ?${collegeFilter.sql}`;

  db.query(sql, [student_id, ...collegeFilter.params], (err, result) => {
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
