export const ROOM_CHAT_REACTIONS = Object.freeze(["👍", "❤️", "😂", "😮", "😢"]);

export const getRoomChatActorType = (memberType) => {
  if (memberType === "admin") return "admin";
  if (["officer", "student"].includes(memberType)) return "member";
  return null;
};

export const getRoomMessageDeleteScope = (message, roomId, member) => {
  if (Number(message.room_id) !== Number(roomId)) return null;

  const senderType = getRoomChatActorType(message.sender_type);
  const memberType = getRoomChatActorType(member.type);
  if (!senderType || !memberType) return null;

  return Number(message.sender_id) === Number(member.id) &&
    senderType === memberType
    ? "everyone"
    : "member";
};

export const getRoomMessageReactions = async (
  connection,
  roomId,
  messageIds,
  member,
) => {
  if (!messageIds.length) return new Map();

  const placeholders = messageIds.map(() => "?").join(", ");
  const [rows] = await connection.query(
    `SELECT message_id, emoji, COUNT(*) AS reaction_count,
            MAX(CASE WHEN member_type = ? AND member_id = ? THEN 1 ELSE 0 END) AS reacted_by_me
     FROM room_message_reaction
     WHERE room_id = ? AND emoji IS NOT NULL
       AND message_id IN (${placeholders})
     GROUP BY message_id, emoji`,
    [
      getRoomChatActorType(member.type),
      member.id,
      roomId,
      ...messageIds,
    ],
  );

  const reactionsByMessage = new Map();
  rows.forEach((reaction) => {
    const messageId = Number(reaction.message_id);
    const reactions = reactionsByMessage.get(messageId) || [];
    reactions.push({
      emoji: reaction.emoji,
      count: Number(reaction.reaction_count),
      reacted_by_me: Boolean(reaction.reacted_by_me),
    });
    reactionsByMessage.set(messageId, reactions);
  });
  return reactionsByMessage;
};

export const toggleRoomMessageReaction = async (
  connection,
  roomId,
  messageId,
  member,
  emoji,
) => {
  const actorType = getRoomChatActorType(member.type);
  if (!actorType || !ROOM_CHAT_REACTIONS.includes(emoji)) {
    throw new Error("Unsupported room message reaction.");
  }

  const [messages] = await connection.query(
    `SELECT m.message_id
     FROM room_message m
     LEFT JOIN room_message_hidden h
       ON h.room_id = m.room_id
      AND h.message_id = m.message_id
      AND h.member_type = ?
      AND h.member_id = ?
     WHERE m.room_id = ? AND m.message_id = ?
       AND h.message_id IS NULL
     LIMIT 1`,
    [actorType, member.id, roomId, messageId],
  );
  if (!messages.length) return null;

  await connection.query(
    `INSERT INTO room_message_reaction
       (room_id, message_id, member_type, member_id, emoji)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       emoji = IF(emoji = VALUES(emoji), NULL, VALUES(emoji)),
       date_created = CURRENT_TIMESTAMP`,
    [roomId, messageId, actorType, member.id, emoji],
  );
  await connection.query(
    `DELETE FROM room_message_reaction
     WHERE room_id = ? AND message_id = ?
       AND member_type = ? AND member_id = ? AND emoji IS NULL`,
    [roomId, messageId, actorType, member.id],
  );
  const [activeReactions] = await connection.query(
    `SELECT emoji FROM room_message_reaction
     WHERE room_id = ? AND message_id = ?
       AND member_type = ? AND member_id = ? AND emoji IS NOT NULL
     LIMIT 1`,
    [roomId, messageId, actorType, member.id],
  );
  return { activeEmoji: activeReactions[0]?.emoji || null };
};
