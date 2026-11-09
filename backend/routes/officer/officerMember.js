import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();
const POSITIONS = [
  "Mayor",
  "Vice-Mayor",
  "Secretary",
  "Treasurer",
  "Auditor",
  "P.I.O.",
  "Protocol Officer",
];

const rankOf = (position) => {
  const normalized = position?.replace("Vice Mayor", "Vice-Mayor");
  return POSITIONS.indexOf(normalized);
};

const canManage = (managerPosition, targetPosition) => {
  const managerRank = rankOf(managerPosition);
  const targetRank = targetPosition ? rankOf(targetPosition) : POSITIONS.length;
  return managerRank >= 0 && targetRank > managerRank;
};

const findManager = (connection, officerId, roomId) =>
  connection.query(
    `SELECT member_id AS student_id, position
       FROM room_member
      WHERE member_id = ? AND room_id = ? AND member_type = 'officer'
      LIMIT 1`,
    [officerId, roomId],
  );

router.post("/:id/promote", authenticateOfficer, async (req, res) => {
  const studentId = Number(req.params.id);
  const { position, roomId, confirmReplace = false } = req.body;
  const parsedRoomId = Number(roomId);
  if (
    !Number.isSafeInteger(studentId) ||
    studentId < 1 ||
    !Number.isSafeInteger(parsedRoomId) ||
    parsedRoomId < 1 ||
    !position ||
    !POSITIONS.includes(position)
  ) {
    return res.status(400).json({ message: "Student, room, and valid position are required." });
  }

  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const [[manager]] = await findManager(connection, req.user.officer_id, parsedRoomId);
    if (!manager || !canManage(manager.position, position)) {
      await connection.rollback();
      return res.status(403).json({ message: "You can only promote members to positions below your own." });
    }

    const [[target]] = await connection.query(
      `SELECT s.student_id, s.first_name, s.last_name, rm.position
       FROM student s INNER JOIN room_member rm ON rm.member_id = s.student_id
       WHERE s.student_id = ? AND rm.room_id = ? AND rm.member_type = 'student'
       LIMIT 1 FOR UPDATE`,
      [studentId, parsedRoomId],
    );
    if (!target) {
      await connection.rollback();
      return res.status(404).json({ message: "Student is not a student member of this room." });
    }
    if (target.position !== "Student") {
      await connection.rollback();
      return res.status(400).json({ message: "This account is already an officer." });
    }

    const [duplicates] = await connection.query(
      `SELECT s.student_id, s.first_name, s.last_name, rm.position
         FROM room_member rm
         INNER JOIN student s ON s.student_id = rm.member_id
        WHERE rm.room_id = ? AND rm.member_type = 'officer'
          AND rm.position = ? AND rm.member_id <> ?
        LIMIT 1 FOR UPDATE`,
      [parsedRoomId, position, studentId],
    );
    if (duplicates.length && !confirmReplace) {
      await connection.rollback();
      return res.status(409).json({
        message: `There is already a ${position}. Confirm to replace that officer.`,
        requiresConfirmation: true,
      });
    }

    if (duplicates.length) {
      await connection.query(
        `UPDATE room_member
            SET member_type = 'student', position = 'Student'
          WHERE room_id = ? AND member_id = ? AND member_type = 'officer'`,
        [parsedRoomId, duplicates[0].student_id],
      );
    }
    await connection.query(
      `UPDATE room_member
          SET member_type = 'officer', position = ?
        WHERE room_id = ? AND member_id = ? AND member_type = 'student'`,
      [position, parsedRoomId, studentId],
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
    res.status(201).json({ message: `${target.first_name} ${target.last_name} promoted to ${position}.` });
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) {
      console.error("Officer promotion rollback error:", rollbackError);
    }
    console.error("Officer promotion error:", error);
    res.status(500).json({ message: "Database error" });
  }
});

router.post("/:id/demote", authenticateOfficer, async (req, res) => {
  const studentId = Number(req.params.id);
  const { roomId } = req.body;
  const parsedRoomId = Number(roomId);
  if (
    !Number.isSafeInteger(studentId) ||
    studentId < 1 ||
    !Number.isSafeInteger(parsedRoomId) ||
    parsedRoomId < 1
  ) {
    return res.status(400).json({ message: "Student and room are required." });
  }

  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const [[manager]] = await findManager(connection, req.user.officer_id, parsedRoomId);
    const [[target]] = await connection.query(
      `SELECT s.student_id, s.first_name, s.last_name, rm.position
       FROM student s INNER JOIN room_member rm ON rm.member_id = s.student_id
       WHERE s.student_id = ? AND rm.room_id = ? AND rm.member_type = 'officer'
       LIMIT 1 FOR UPDATE`,
      [studentId, parsedRoomId],
    );
    if (!manager || !target || !canManage(manager.position, target.position)) {
      await connection.rollback();
      return res.status(403).json({ message: "You can only demote officers below your own position." });
    }

    await connection.query(
      `UPDATE room_member
          SET member_type = 'student', position = 'Student'
        WHERE room_id = ? AND member_id = ? AND member_type = 'officer'`,
      [parsedRoomId, studentId],
    );
    await connection.commit();
    res.json({ message: `${target.first_name} ${target.last_name} was demoted to student.` });
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) {
      console.error("Officer demotion rollback error:", rollbackError);
    }
    console.error("Officer demotion error:", error);
    res.status(500).json({ message: "Database error" });
  }
});

export default router;
