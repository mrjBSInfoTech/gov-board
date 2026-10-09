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

const findManager = (connection, officerId) =>
  connection.query(
    "SELECT student_id, position FROM student WHERE student_id = ? AND role IS NOT NULL LIMIT 1",
    [officerId],
  );

router.post("/:id/promote", authenticateOfficer, async (req, res) => {
  const studentId = Number(req.params.id);
  const { position, roomId, confirmReplace = false } = req.body;
  if (!studentId || !position || !roomId || !POSITIONS.includes(position)) {
    return res.status(400).json({ message: "Student, room, and valid position are required." });
  }

  const connection = db.promise();
  try {
    const [[manager]] = await findManager(connection, req.user.officer_id);
    if (!manager || !canManage(manager.position, position)) {
      return res.status(403).json({ message: "You can only promote members to positions below your own." });
    }

    const [[target]] = await connection.query(
      `SELECT s.student_id, s.first_name, s.last_name, s.position
       FROM student s INNER JOIN room_member rm ON rm.member_id = s.student_id
       WHERE s.student_id = ? AND rm.room_id = ? LIMIT 1`,
      [studentId, roomId],
    );
    if (!target) return res.status(404).json({ message: "Student is not in this room." });
    if (target.position !== "Student" && rankOf(target.position) < POSITIONS.length) {
      return res.status(400).json({ message: "This account is already an officer." });
    }

    const [duplicates] = await connection.query(
      `SELECT student_id, first_name, last_name, position FROM student
       WHERE batch_id = (SELECT batch_id FROM student WHERE student_id = ?)
         AND position = ? AND role IS NOT NULL LIMIT 1`,
      [studentId, position],
    );
    if (duplicates.length && !confirmReplace) {
      return res.status(409).json({
        message: `There is already a ${position}. Confirm to replace that officer.`,
        requiresConfirmation: true,
      });
    }

    await connection.beginTransaction();
    if (duplicates.length) {
      await connection.query(
        `UPDATE student SET position = 'Student', role = NULL,
          can_add = 0, can_edit = 0, can_delete = 0, can_moderate = 0
         WHERE student_id = ?`,
        [duplicates[0].student_id],
      );
      await connection.query(
        "UPDATE room_member SET member_type = 'student' WHERE member_id = ?",
        [duplicates[0].student_id],
      );
    }
    await connection.query(
      `UPDATE student SET position = ?, role = 'officer',
        can_add = 1, can_edit = 1, can_delete = 1, can_moderate = 0
       WHERE student_id = ?`,
      [position, studentId],
    );
    await connection.query(
      "UPDATE room_member SET member_type = 'officer' WHERE member_id = ?",
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
  if (!studentId || !roomId) return res.status(400).json({ message: "Student and room are required." });

  const connection = db.promise();
  try {
    const [[manager]] = await findManager(connection, req.user.officer_id);
    const [[target]] = await connection.query(
      `SELECT s.student_id, s.first_name, s.last_name, s.position
       FROM student s INNER JOIN room_member rm ON rm.member_id = s.student_id
       WHERE s.student_id = ? AND rm.room_id = ? AND s.role IS NOT NULL LIMIT 1`,
      [studentId, roomId],
    );
    if (!manager || !target || !canManage(manager.position, target.position)) {
      return res.status(403).json({ message: "You can only demote officers below your own position." });
    }

    await connection.beginTransaction();
    await connection.query(
      `UPDATE student SET position = 'Student', role = NULL,
        can_add = 0, can_edit = 0, can_delete = 0, can_moderate = 0
       WHERE student_id = ?`,
      [studentId],
    );
    await connection.query(
      "UPDATE room_member SET member_type = 'student' WHERE member_id = ?",
      [studentId],
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
