import db from "../../database/db.js";
import {
  getQuestDateKey,
  getRoomLevelProgress,
} from "./roomQuestRules.js";

const XP_VALUES = {
  login: 10,
  chat: 15,
};

const ensureRoomLevel = async (roomId) => {
  await db.promise().query(
    `INSERT INTO room_level (room_id, total_exp, level)
     VALUES (?, 0, 1)
     ON DUPLICATE KEY UPDATE room_id = room_id`,
    [roomId],
  );
};

export async function awardRoomXp(roomId, memberId, activityType) {
  const exp = XP_VALUES[activityType];
  if (!Number.isSafeInteger(roomId) || roomId < 1 ||
      !Number.isSafeInteger(memberId) || memberId < 1 || !exp) {
    throw new Error("A valid room, member, and quest activity are required.");
  }

  const activityKey = getQuestDateKey();
  await ensureRoomLevel(roomId);
  const [insertResult] = await db.promise().query(
    `INSERT IGNORE INTO room_xp_activity
      (room_id, member_id, activity_type, activity_key, exp_awarded)
     VALUES (?, ?, ?, ?, ?)`,
    [roomId, memberId, activityType, activityKey, exp],
  );

  if (!insertResult.affectedRows) {
    return { awarded: false, exp: 0 };
  }

  await db.promise().query(
    `UPDATE room_level
        SET total_exp = total_exp + ?
      WHERE room_id = ?`,
    [exp, roomId],
  );
  const [rows] = await db.promise().query(
    "SELECT total_exp FROM room_level WHERE room_id = ?",
    [roomId],
  );
  if (!rows.length) {
    throw new Error("Room level record disappeared after XP was awarded.");
  }

  const progress = getRoomLevelProgress(rows[0].total_exp);
  await db.promise().query(
    "UPDATE room_level SET level = ? WHERE room_id = ?",
    [progress.level, roomId],
  );

  return { awarded: true, exp };
}

export async function awardLoginXp(memberId) {
  const [rooms] = await db.promise().query(
    `SELECT room_id FROM room_member
      WHERE member_id = ? AND member_type IN ('student', 'officer')`,
    [memberId],
  );

  await Promise.all(
    rooms.map(({ room_id: roomId }) => awardRoomXp(roomId, memberId, "login")),
  );
}

export async function getRoomLevel(roomId) {
  await ensureRoomLevel(roomId);
  const [rows] = await db.promise().query(
    "SELECT room_id, total_exp FROM room_level WHERE room_id = ?",
    [roomId],
  );

  if (!rows.length) return null;
  return {
    room_id: rows[0].room_id,
    total_exp: Number(rows[0].total_exp),
    ...getRoomLevelProgress(rows[0].total_exp),
  };
}

export async function getRoomQuests(roomId, memberId) {
  const dayKey = getQuestDateKey();
  const [activityRows] = await db.promise().query(
    `SELECT activity_type, exp_awarded
       FROM room_xp_activity
      WHERE room_id = ? AND member_id = ? AND activity_key = ?
        AND activity_type IN ('login', 'chat')`,
    [roomId, memberId, dayKey],
  );
  const completed = new Map(
    activityRows.map((row) => [row.activity_type, Number(row.exp_awarded)]),
  );

  return {
    day_key: dayKey,
    reset_time: "04:00",
    time_zone: process.env.QUEST_TIME_ZONE || "Asia/Manila",
    room_level: await getRoomLevel(roomId),
    tasks: [
      {
        id: "login",
        title: "Daily Login",
        description: "Log in once each day to earn experience for your room.",
        exp: XP_VALUES.login,
        completed: completed.has("login"),
        exp_awarded: completed.get("login") || 0,
      },
      {
        id: "chat",
        title: "Room Chat",
        description: "Send at least one message in your room each day.",
        exp: XP_VALUES.chat,
        completed: completed.has("chat"),
        exp_awarded: completed.get("chat") || 0,
      },
    ],
  };
}
