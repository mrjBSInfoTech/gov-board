import express from "express";
import bcrypt from "bcryptjs";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import {
  getAdminCollegeFilter,
  resolveAdminCollege,
  PRIMARY_ADMIN_ID,
} from "../../utils/shared/adminScope.js";
import {
  canDeleteStudent,
  canAssignStudentPosition,
  canCreateStudentAccount,
  canEditStudentDetails,
  canGrantGovernorEditPermission,
  canManageAdminAccounts,
} from "../../utils/shared/adminPermissions.js";

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
  const collegeFilter = getAdminCollegeFilter(req, "s.college");
  const sql = `
    SELECT
      s.student_id AS officer_id,
      s.admin_id,
      s.student_number,
      s.position,
      s.college,
      s.course,
      b.year_name AS year,
      b.section_name AS section,
      s.first_name,
      s.last_name,
      s.date_created,
      s.student_id AS officer_role_id,
      s.role,
      s.can_add,
      s.can_edit,
      s.can_delete,
      s.can_moderate
    FROM student s
    LEFT JOIN batch b ON b.batch_id = s.batch_id
    WHERE s.role IS NOT NULL${collegeFilter.sql}
    ORDER BY s.date_created DESC`;

  db.query(sql, collegeFilter.params, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(result);
  });
});

router.get("/admins", authenticateAdmin, (req, res) => {
  const collegeFilter = getAdminCollegeFilter(req, "college");
  const sql = `
    SELECT admin_id, username, first_name, last_name, position, college,
      can_edit_students, date_created
    FROM admin
    WHERE 1 = 1${collegeFilter.sql}
    ORDER BY date_created DESC, admin_id ASC`;

  db.query(sql, collegeFilter.params, (err, result) => {
    if (err) {
      console.error("Admin account list error:", err);
      return res.status(500).json({ message: "Unable to load admin accounts." });
    }
    res.json(result);
  });
});

router.post("/admins", authenticateAdmin, async (req, res) => {
  if (!canManageAdminAccounts(req.user)) {
    return res.status(403).json({ message: "Only the Super Admin can create admins." });
  }

  const username = String(req.body.username ?? "").trim();
  const firstName = String(req.body.first_name ?? "").trim();
  const lastName = String(req.body.last_name ?? "").trim();
  const position = String(req.body.position ?? "").trim();
  const college = String(req.body.college ?? "").trim();
  const password = String(req.body.password ?? "");

  if (
    !username ||
    !firstName ||
    !lastName ||
    !["Governor", "College Head"].includes(position) ||
    !college ||
    password.length < 8
  ) {
    return res.status(400).json({
      message: "Provide all admin details and a password of at least 8 characters.",
    });
  }

  try {
    const [result] = await db.promise().query(
      `INSERT INTO admin
        (username, first_name, last_name, role, position, college, password)
       VALUES (?, ?, ?, 'Admin', ?, ?, ?)`,
      [
        username,
        firstName,
        lastName,
        position,
        college,
        await bcrypt.hash(password, 10),
      ],
    );
    res.status(201).json({ message: "Admin account created.", admin_id: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username is already in use." });
    }
    console.error("Admin account creation error:", error);
    res.status(500).json({ message: "Unable to create admin account." });
  }
});

router.put("/admins/:id", authenticateAdmin, async (req, res) => {
  if (!canManageAdminAccounts(req.user)) {
    return res.status(403).json({ message: "Only the Super Admin can manage admin accounts." });
  }

  const adminId = Number(req.params.id);
  const username = String(req.body.username ?? "").trim();
  const firstName = String(req.body.first_name ?? "").trim();
  const lastName = String(req.body.last_name ?? "").trim();
  const position = String(req.body.position ?? "").trim();
  const college = String(req.body.college ?? "").trim();
  const password = String(req.body.password ?? "");

  if (!Number.isSafeInteger(adminId) || adminId < 1) {
    return res.status(400).json({ message: "A valid admin ID is required." });
  }
  if (
    !username ||
    !firstName ||
    !lastName ||
    (adminId === PRIMARY_ADMIN_ID
      ? position !== "Super Admin"
      : !["Governor", "College Head"].includes(position)) ||
    (adminId !== PRIMARY_ADMIN_ID && !college) ||
    (password && password.length < 8)
  ) {
    return res.status(400).json({ message: "Admin details are invalid." });
  }

  try {
    const values = [
      username,
      firstName,
      lastName,
      position,
      adminId === PRIMARY_ADMIN_ID ? null : college,
      position === "Governor" && req.body.can_edit_students ? 1 : 0,
    ];
    let sql = `UPDATE admin
      SET username = ?, first_name = ?, last_name = ?, position = ?,
          college = ?, can_edit_students = ?`;
    if (password) {
      sql += ", password = ?";
      values.push(await bcrypt.hash(password, 10));
    }
    sql += " WHERE admin_id = ?";
    values.push(adminId);

    const [result] = await db.promise().query(sql, values);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Admin account not found." });
    }
    res.json({ message: "Admin account updated." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username is already in use." });
    }
    console.error("Admin account update error:", error);
    res.status(500).json({ message: "Unable to update admin account." });
  }
});

router.patch("/admins/:id/student-edit-permission", authenticateAdmin, async (req, res) => {
  const adminId = Number(req.params.id);
  const enabled =
    req.body.can_edit_students === true || req.body.can_edit_students === 1;
  if (!Number.isSafeInteger(adminId) || adminId < 1) {
    return res.status(400).json({ message: "A valid admin ID is required." });
  }

  try {
    const [rows] = await db.promise().query(
      "SELECT admin_id, position, college FROM admin WHERE admin_id = ? LIMIT 1",
      [adminId],
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Admin account not found." });
    }
    const target = rows[0];
    if (!canGrantGovernorEditPermission(req.user, target)) {
      return res.status(403).json({
        message: "Only the College Head for this college or Super Admin can change this permission.",
      });
    }

    const collegeFilter = req.user.is_super_admin ? "" : " AND LOWER(college) = LOWER(?)";
    const values = req.user.is_super_admin
      ? [enabled ? 1 : 0, adminId]
      : [enabled ? 1 : 0, adminId, req.user.college];
    const [result] = await db.promise().query(
      `UPDATE admin
       SET can_edit_students = ?
       WHERE admin_id = ? AND position = 'Governor'${collegeFilter}`,
      values,
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Governor account was not updated." });
    }
    res.json({ message: "Governor student-edit permission updated." });
  } catch (error) {
    console.error("Governor permission update error:", error);
    res.status(500).json({ message: "Unable to update Governor permission." });
  }
});

router.delete("/admins/:id", authenticateAdmin, async (req, res) => {
  if (!canManageAdminAccounts(req.user)) {
    return res.status(403).json({ message: "Only the Super Admin can delete admins." });
  }
  const adminId = Number(req.params.id);
  if (!Number.isSafeInteger(adminId) || adminId < 1) {
    return res.status(400).json({ message: "A valid admin ID is required." });
  }
  if (adminId === PRIMARY_ADMIN_ID) {
    return res.status(403).json({ message: "The primary Super Admin cannot be deleted." });
  }

  db.query("DELETE FROM admin WHERE admin_id = ?", [adminId], (error, result) => {
    if (error) {
      console.error("Admin account deletion error:", error);
      return res.status(500).json({ message: "Unable to delete admin account." });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Admin account not found." });
    }
    res.json({ message: "Admin account deleted." });
  });
});

router.post("/:id/demote", authenticateAdmin, async (req, res) => {
  if (!canAssignStudentPosition(req.user)) {
    return res.status(403).json({ message: "You cannot change student positions." });
  }
  const officerId = Number(req.params.id);
  const requestedRoomId = req.body?.roomId;
  const roomId = requestedRoomId == null ? null : Number(requestedRoomId);

  if (!Number.isSafeInteger(officerId) || officerId < 1) {
    return res.status(400).json({ message: "Officer ID is required." });
  }
  if (requestedRoomId != null && (!Number.isSafeInteger(roomId) || roomId < 1)) {
    return res.status(400).json({ message: "A valid room is required." });
  }

  try {
    const connection = db.promise();
    await connection.beginTransaction();
    const collegeFilter = getAdminCollegeFilter(req, "s.college");
    const roomFilter = roomId ? getAdminCollegeFilter(req, "r.college") : null;

    const [officerRows] = await connection.query(
      `SELECT s.student_id, s.first_name, s.last_name,
              b.year_name AS year, b.section_name AS section
       FROM student s
       LEFT JOIN batch b ON b.batch_id = s.batch_id
       ${roomId ? "INNER JOIN room_member rm ON rm.member_id = s.student_id AND rm.room_id = ? AND rm.member_type = 'officer'" : ""}
       ${roomId ? "INNER JOIN room r ON r.room_id = rm.room_id" : ""}
       WHERE s.student_id = ?${roomId ? "" : " AND s.role IS NOT NULL"}${collegeFilter.sql}${roomFilter?.sql || ""}
       LIMIT 1`,
      roomId
        ? [roomId, officerId, ...collegeFilter.params, ...roomFilter.params]
        : [officerId, ...collegeFilter.params],
    );

    if (!officerRows || officerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Officer not found" });
    }

    const officer = officerRows[0];

    if (roomId) {
      await connection.query(
        `UPDATE room_member
            SET member_type = 'student', position = 'Student'
          WHERE room_id = ? AND member_id = ? AND member_type = 'officer'`,
        [roomId, officerId],
      );
      await connection.commit();
      return res.json({
        message: `${officer.first_name} ${officer.last_name} was demoted in this room.`,
      });
    }

    await connection.query(
      `UPDATE student
       SET position = 'Student', role = NULL,
           can_add = 0, can_edit = 0, can_delete = 0, can_moderate = 0
       WHERE student_id = ?${getAdminCollegeFilter(req, "college").sql}`,
      [officerId, ...getAdminCollegeFilter(req, "college").params],
    );
    await connection.query(
      "UPDATE room_member SET member_type = 'student', position = 'Student' WHERE member_id = ?",
      [officerId],
    );

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
  if (!canCreateStudentAccount(req.user)) {
    return res.status(403).json({
      message: "Only the College Head or Super Admin can create student or officer accounts.",
    });
  }
  const {
    student_number,
    college: requestedCollege,
    course: requestedCourse,
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
  const college = resolveAdminCollege(req, requestedCollege);
  const course = typeof requestedCourse === "string" ? requestedCourse.trim() : "";
  if (requestedCourse != null && typeof requestedCourse !== "string") {
    return res.status(400).json({ message: "Course must be text." });
  }

  if (!college && !req.user.is_super_admin) {
    return res.status(403).json({ message: "You can only manage your college." });
  }
  if (
    !first_name ||
    !last_name ||
    !password ||
    !student_number ||
    !college ||
    !position ||
    !year ||
    !section
  ) {
    return res
      .status(400)
      .json({ message: "Please fill all the required fields" });
  }
  if (course.length > 150) {
    return res.status(400).json({ message: "Course must be 150 characters or fewer." });
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
    await connection.query(
      `INSERT INTO student (admin_id, student_number, position, college, course, batch_id, first_name, last_name, password, role, can_add, can_edit, can_delete, can_moderate, date_created)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.admin_id,
        student_number.trim(),
        position.trim(),
        college,
        course || null,
        batchId,
        first_name.trim(),
        last_name.trim(),
        await bcrypt.hash(password, 10),
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
  if (!canEditStudentDetails(req.user)) {
    return res.status(403).json({
      message: "You do not have permission to edit student or officer details.",
    });
  }
  const { id } = req.params;
  const {
    student_number,
    college: requestedCollege,
    course: requestedCourse,
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
  const college = resolveAdminCollege(req, requestedCollege);
  const course = typeof requestedCourse === "string" ? requestedCourse.trim() : "";
  if (requestedCourse != null && typeof requestedCourse !== "string") {
    return res.status(400).json({ message: "Course must be text." });
  }

  if (!college && !req.user.is_super_admin) {
    return res.status(403).json({ message: "You can only manage your college." });
  }
  if (
    !first_name ||
    !last_name ||
    !student_number ||
    !college ||
    !position ||
    !year ||
    !section
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

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const batchId = await resolveBatchId(connection, year, section);

    const permissions = rolePermissions(role || "officer", {
      can_add,
      can_edit,
      can_delete,
      can_moderate,
    });
    const collegeFilter = getAdminCollegeFilter(req, "college");
    const updateSql = password
      ? `UPDATE student SET student_number = ?, position = ?, college = ?, course = ?, batch_id = ?, first_name = ?, last_name = ?, password = ?, role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_moderate = ? WHERE student_id = ?${collegeFilter.sql}`
      : `UPDATE student SET student_number = ?, position = ?, college = ?, course = ?, batch_id = ?, first_name = ?, last_name = ?, role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_moderate = ? WHERE student_id = ?${collegeFilter.sql}`;

    const updateParams = password
      ? [
          student_number.trim(),
          position.trim(),
          college,
          course || null,
          batchId,
          first_name.trim(),
          last_name.trim(),
          hashedPassword,
          role || "officer",
          permissions.can_add,
          permissions.can_edit,
          permissions.can_delete,
          permissions.can_moderate,
          id,
          ...collegeFilter.params,
        ]
      : [
          student_number.trim(),
          position.trim(),
          college,
          course || null,
          batchId,
          first_name.trim(),
          last_name.trim(),
          role || "officer",
          permissions.can_add,
          permissions.can_edit,
          permissions.can_delete,
          permissions.can_moderate,
          id,
          ...collegeFilter.params,
        ];

    const [officerResult] = await connection.query(updateSql, updateParams);

    if (officerResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Officer not found" });
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
  if (!canDeleteStudent(req.user)) {
    return res.status(403).json({
      message: "Only the College Head or Super Admin can delete students.",
    });
  }
  const { id } = req.params;
  const collegeFilter = getAdminCollegeFilter(req, "college");

  try {
    const connection = db.promise();
    await connection.beginTransaction();

    const [officerResult] = await connection.query(
      `DELETE FROM student WHERE student_id = ? AND role IS NOT NULL${collegeFilter.sql}`,
      [id, ...collegeFilter.params],
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
