import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";
import { clearOrphanedOfficerStatus } from "../../utils/shared/roomOfficerAccess.js";
import {
  canAccessRoomModeration,
  canModerateTarget,
  canPromoteToPosition,
  MUTE_DURATIONS,
  OFFICER_POSITIONS,
} from "../../utils/officer/roomModeration.js";
import { canAccessGovernanceSection } from "../../utils/officer/governancePermissions.js";

const router = express.Router();

const parseRoomId = (value) => {
  const roomId = Number(value);
  return Number.isSafeInteger(roomId) && roomId > 0 ? roomId : null;
};

const parseMemberId = (value) => {
  const memberId = Number(value);
  return Number.isSafeInteger(memberId) && memberId > 0 ? memberId : null;
};

const getRoomModerator = async (
  connection,
  officerId,
  roomId,
  lock = false,
  readOnlyAccess = false,
) => {
  const [rows] = await connection.query(
    `SELECT position
       FROM room_member
      WHERE room_id = ? AND member_id = ? AND member_type = 'officer'
      LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [roomId, officerId],
  );
  if (!rows.length) return null;
  return (
    canAccessRoomModeration(rows[0].position) ||
    (readOnlyAccess && canAccessGovernanceSection(rows[0].position, "moderate"))
  )
    ? rows[0]
    : null;
};

const getRoomTarget = async (connection, roomId, memberId, lock = false) => {
  const [rows] = await connection.query(
    `SELECT rm.member_id, rm.member_type, rm.position,
            s.first_name, s.last_name, s.student_number
       FROM room_member rm
       INNER JOIN student s ON s.student_id = rm.member_id
      WHERE rm.room_id = ? AND rm.member_id = ?
      LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [roomId, memberId],
  );
  return rows[0] || null;
};

const requireRoomAndMemberIds = (req, res) => {
  const roomId = parseRoomId(req.body?.roomId);
  const memberId = parseMemberId(req.params.memberId);
  if (!roomId || !memberId) {
    res.status(400).json({ message: "A valid room and member are required." });
    return null;
  }
  return { roomId, memberId };
};

router.get("/members", authenticateOfficer, async (req, res) => {
  const officerId = parseMemberId(req.user?.officer_id);
  const roomId = parseRoomId(req.query.roomId);
  if (!roomId) {
    return res.status(400).json({ message: "A valid roomId is required." });
  }

  try {
    const connection = db.promise();
    const moderator = await getRoomModerator(connection, officerId, roomId, false, true);
    if (!moderator) {
      return res.status(403).json({
        message: "Your position cannot access this room's moderation records.",
      });
    }

    const [members] = await connection.query(
      `SELECT s.student_id AS id, s.first_name, s.last_name,
              s.student_number, rm.position, b.year_name AS year,
              b.section_name AS section, rm.member_type,
              CASE
                WHEN rm.muted_until > UTC_TIMESTAMP()
                THEN DATE_FORMAT(rm.muted_until, '%Y-%m-%dT%H:%i:%sZ')
                ELSE NULL
              END AS muted_until
         FROM room_member rm
         INNER JOIN student s ON s.student_id = rm.member_id
         LEFT JOIN batch b ON b.batch_id = s.batch_id
        WHERE rm.room_id = ?
        ORDER BY rm.member_type ASC, s.first_name ASC, s.last_name ASC`,
      [roomId],
    );
    return res.json(
      members.map((member) => ({
        ...member,
        member_type: member.member_type === "officer" ? "Officer" : "Student",
      })),
    );
  } catch (error) {
    console.error("Room moderation member list error:", error);
    return res.status(500).json({ message: "Unable to load room members." });
  }
});

router.post("/:memberId/kick", authenticateOfficer, async (req, res) => {
  const ids = requireRoomAndMemberIds(req, res);
  if (!ids) return;
  const actorId = parseMemberId(req.user?.officer_id);
  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const moderator = await getRoomModerator(connection, actorId, ids.roomId, true);
    const target = await getRoomTarget(connection, ids.roomId, ids.memberId, true);
    if (
      !moderator ||
      !target ||
      !canModerateTarget(
        moderator.position,
        "kick",
        { memberType: target.member_type, position: target.position },
        actorId,
        ids.memberId,
      )
    ) {
      await connection.rollback();
      return res.status(403).json({ message: "You cannot kick this room member." });
    }

    await connection.query(
      "DELETE FROM room_member WHERE room_id = ? AND member_id = ?",
      [ids.roomId, ids.memberId],
    );
    if (target.member_type === "officer") {
      await clearOrphanedOfficerStatus(connection, [ids.memberId]);
    }
    await connection.commit();
    req.auditRoomId = ids.roomId;
    req.auditInformation = `Kicked ${target.member_type} "${target.first_name} ${target.last_name}" from the room`;
    return res.json({ message: "Member removed from this room." });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Room member kick rollback error:", rollbackError);
    }
    console.error("Room member kick error:", error);
    return res.status(500).json({ message: "Unable to remove room member." });
  }
});

router.post("/:memberId/promote", authenticateOfficer, async (req, res) => {
  const ids = requireRoomAndMemberIds(req, res);
  if (!ids) return;
  const actorId = parseMemberId(req.user?.officer_id);
  const { position, confirmReplace = false } = req.body;
  if (!OFFICER_POSITIONS.includes(position)) {
    return res.status(400).json({ message: "A valid officer position is required." });
  }

  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const moderator = await getRoomModerator(connection, actorId, ids.roomId, true);
    const target = await getRoomTarget(connection, ids.roomId, ids.memberId, true);
    if (
      !moderator ||
      !target ||
      !canModerateTarget(
        moderator.position,
        "promote",
        { memberType: target.member_type, position: target.position },
        actorId,
        ids.memberId,
      ) ||
      !canPromoteToPosition(
        moderator.position,
        { memberType: target.member_type, position: target.position },
        position,
      )
    ) {
      await connection.rollback();
      return res.status(403).json({ message: "You cannot promote this member to that position." });
    }

    const [duplicates] = await connection.query(
      `SELECT rm.member_id, rm.position, s.first_name, s.last_name
         FROM room_member rm
         INNER JOIN student s ON s.student_id = rm.member_id
        WHERE rm.room_id = ? AND rm.member_type = 'officer'
          AND rm.position = ? AND rm.member_id <> ?
        LIMIT 1 FOR UPDATE`,
      [ids.roomId, position, ids.memberId],
    );
    if (duplicates.length && !confirmReplace) {
      await connection.rollback();
      return res.status(409).json({
        message: `There is already a ${position} in this room. Confirm to replace that officer.`,
        requiresConfirmation: true,
      });
    }
    if (
      duplicates.length &&
      !canModerateTarget(
        moderator.position,
        "demote",
        { memberType: "officer", position: duplicates[0].position },
        actorId,
        duplicates[0].member_id,
      )
    ) {
      await connection.rollback();
      return res.status(403).json({
        message: "You cannot replace the officer currently holding that position.",
      });
    }

    if (duplicates.length) {
      await connection.query(
        `UPDATE room_member
            SET member_type = 'student', position = 'Student'
          WHERE room_id = ? AND member_id = ? AND member_type = 'officer'`,
        [ids.roomId, duplicates[0].member_id],
      );
      await clearOrphanedOfficerStatus(connection, [duplicates[0].member_id]);
    }
    await connection.query(
      `UPDATE room_member
          SET member_type = 'officer', position = ?, muted_until = NULL
        WHERE room_id = ? AND member_id = ?`,
      [position, ids.roomId, ids.memberId],
    );
    await connection.query(
      `UPDATE student
          SET can_add = IF(role IS NULL, 1, can_add),
              can_edit = IF(role IS NULL, 1, can_edit),
              can_delete = IF(role IS NULL, 1, can_delete),
              can_moderate = IF(role IS NULL, 0, can_moderate),
              role = COALESCE(role, 'officer')
        WHERE student_id = ?`,
      [ids.memberId],
    );
    await connection.commit();
    req.auditRoomId = ids.roomId;
    req.auditInformation = duplicates.length
      ? `Promoted "${target.first_name} ${target.last_name}" from ${target.position} to ${position}, replacing "${duplicates[0].first_name} ${duplicates[0].last_name}"`
      : `Promoted "${target.first_name} ${target.last_name}" from ${target.position} to ${position}`;
    return res.json({ message: `Member promoted to ${position} in this room.` });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Room member promotion rollback error:", rollbackError);
    }
    console.error("Room member promotion error:", error);
    return res.status(500).json({ message: "Unable to promote room member." });
  }
});

router.post("/:memberId/demote", authenticateOfficer, async (req, res) => {
  const ids = requireRoomAndMemberIds(req, res);
  if (!ids) return;
  const actorId = parseMemberId(req.user?.officer_id);
  const connection = db.promise();
  try {
    await connection.beginTransaction();
    const moderator = await getRoomModerator(connection, actorId, ids.roomId, true);
    const target = await getRoomTarget(connection, ids.roomId, ids.memberId, true);
    if (
      !moderator ||
      !target ||
      !canModerateTarget(
        moderator.position,
        "demote",
        { memberType: target.member_type, position: target.position },
        actorId,
        ids.memberId,
      )
    ) {
      await connection.rollback();
      return res.status(403).json({ message: "You cannot demote this room member." });
    }

    await connection.query(
      `UPDATE room_member
          SET member_type = 'student', position = 'Student'
        WHERE room_id = ? AND member_id = ? AND member_type = 'officer'`,
      [ids.roomId, ids.memberId],
    );
    await clearOrphanedOfficerStatus(connection, [ids.memberId]);
    await connection.commit();
    req.auditRoomId = ids.roomId;
    req.auditInformation = `Demoted "${target.first_name} ${target.last_name}" from ${target.position} to Student`;
    return res.json({ message: "Officer demoted to student in this room." });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Room member demotion rollback error:", rollbackError);
    }
    console.error("Room member demotion error:", error);
    return res.status(500).json({ message: "Unable to demote room member." });
  }
});

router.post("/:memberId/mute", authenticateOfficer, async (req, res) => {
  const ids = requireRoomAndMemberIds(req, res);
  if (!ids) return;
  const actorId = parseMemberId(req.user?.officer_id);
  const durationMinutes = Number(req.body?.durationMinutes);
  if (!MUTE_DURATIONS.includes(durationMinutes)) {
    return res.status(400).json({ message: "Choose a mute duration of up to 24 hours." });
  }

  const connection = db.promise();
  try {
    const moderator = await getRoomModerator(connection, actorId, ids.roomId);
    const target = await getRoomTarget(connection, ids.roomId, ids.memberId);
    if (
      !moderator ||
      !target ||
      !canModerateTarget(
        moderator.position,
        "mute",
        { memberType: target.member_type, position: target.position },
        actorId,
        ids.memberId,
      )
    ) {
      return res.status(403).json({ message: "You cannot mute this room member." });
    }

    await connection.query(
      `UPDATE room_member
          SET muted_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
        WHERE room_id = ? AND member_id = ?`,
      [durationMinutes, ids.roomId, ids.memberId],
    );
    req.auditRoomId = ids.roomId;
    req.auditInformation = `Muted "${target.first_name} ${target.last_name}" for ${durationMinutes} minutes`;
    return res.json({ message: `Member muted for ${durationMinutes} minutes.` });
  } catch (error) {
    console.error("Room member mute error:", error);
    return res.status(500).json({ message: "Unable to mute room member." });
  }
});

router.post("/:memberId/unmute", authenticateOfficer, async (req, res) => {
  const ids = requireRoomAndMemberIds(req, res);
  if (!ids) return;
  const actorId = parseMemberId(req.user?.officer_id);

  try {
    const connection = db.promise();
    const moderator = await getRoomModerator(connection, actorId, ids.roomId);
    const target = await getRoomTarget(connection, ids.roomId, ids.memberId);
    if (
      !moderator ||
      !target ||
      !canModerateTarget(
        moderator.position,
        "unmute",
        { memberType: target.member_type, position: target.position },
        actorId,
        ids.memberId,
      )
    ) {
      return res.status(403).json({ message: "You cannot unmute this room member." });
    }

    await connection.query(
      "UPDATE room_member SET muted_until = NULL WHERE room_id = ? AND member_id = ?",
      [ids.roomId, ids.memberId],
    );
    req.auditRoomId = ids.roomId;
    req.auditInformation = `Unmuted "${target.first_name} ${target.last_name}"`;
    return res.json({ message: "Member unmuted." });
  } catch (error) {
    console.error("Room member unmute error:", error);
    return res.status(500).json({ message: "Unable to unmute room member." });
  }
});

export default router;
