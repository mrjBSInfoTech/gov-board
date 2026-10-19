import db from "../../database/db.js";

const XP_VALUES = {
  login: 10,
  chat: 5,
  calendar_view: 2,
};

const getDateKey = () => new Date().toISOString().slice(0, 10);

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
  if (!Number.isInteger(roomId) || !Number.isInteger(memberId) || !exp) {
    return false;
  }

  const activityKey = getDateKey();

  try {
    await ensureRoomLevel(roomId);
    const [insertResult] = await db.promise().query(
      `INSERT IGNORE INTO room_xp_activity
        (room_id, member_id, activity_type, activity_key, exp_awarded)
       VALUES (?, ?, ?, ?, ?)`,
      [roomId, memberId, activityType, activityKey, exp],
    );

    if (insertResult.affectedRows) {
      await db.promise().query(
        `UPDATE room_level
            SET level = FLOOR(SQRT((total_exp + ?) / 100)) + 1,
                total_exp = total_exp + ?
          WHERE room_id = ?`,
        [exp, exp, roomId],
      );
    }

    return true;
  } catch (error) {
    console.error("Room XP award error:", error.message);
    return false;
  }
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
    `SELECT room_id, total_exp, level,
            (level - 1) * (level - 1) * 100 AS current_level_exp,
            level * level * 100 AS next_level_exp
       FROM room_level WHERE room_id = ?`,
    [roomId],
  );

  return rows[0] || null;
}
