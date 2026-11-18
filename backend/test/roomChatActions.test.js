import test from "node:test";
import assert from "node:assert/strict";
import {
  getRoomChatActorType,
  getRoomMessageDeleteScope,
  getRoomMessageReactions,
  toggleRoomMessageReaction,
} from "../utils/shared/roomChatActions.js";

const createRoomChatConnection = (messages, reactions = [], hidden = []) => ({
  async query(sql, params) {
    if (sql.includes("SELECT m.message_id")) {
      const [memberType, memberId, roomId, messageId] = params;
      const message = messages.find(
        (item) =>
          Number(item.room_id) === Number(roomId) &&
          Number(item.message_id) === Number(messageId),
      );
      const isHidden = hidden.some(
        (item) =>
          Number(item.room_id) === Number(roomId) &&
          Number(item.message_id) === Number(messageId) &&
          item.member_type === memberType &&
          Number(item.member_id) === Number(memberId),
      );
      return [message && !isHidden ? [{ message_id: messageId }] : []];
    }

    if (sql.includes("INSERT INTO room_message_reaction")) {
      const [roomId, messageId, memberType, memberId, emoji] = params;
      const existing = reactions.find(
        (item) =>
          Number(item.room_id) === Number(roomId) &&
          Number(item.message_id) === Number(messageId) &&
          item.member_type === memberType &&
          Number(item.member_id) === Number(memberId),
      );
      if (existing) {
        existing.emoji = existing.emoji === emoji ? null : emoji;
      } else {
        reactions.push({ room_id: roomId, message_id: messageId, member_type: memberType, member_id: memberId, emoji });
      }
      return [{ affectedRows: 1 }];
    }

    if (sql.includes("DELETE FROM room_message_reaction")) {
      const [roomId, messageId, memberType, memberId] = params;
      const index = reactions.findIndex(
        (item) =>
          Number(item.room_id) === Number(roomId) &&
          Number(item.message_id) === Number(messageId) &&
          item.member_type === memberType &&
          Number(item.member_id) === Number(memberId) &&
          item.emoji === null,
      );
      if (index >= 0) reactions.splice(index, 1);
      return [{ affectedRows: index >= 0 ? 1 : 0 }];
    }

    if (sql.includes("SELECT emoji FROM room_message_reaction")) {
      const [roomId, messageId, memberType, memberId] = params;
      const reaction = reactions.find(
        (item) =>
          Number(item.room_id) === Number(roomId) &&
          Number(item.message_id) === Number(messageId) &&
          item.member_type === memberType &&
          Number(item.member_id) === Number(memberId) &&
          item.emoji !== null,
      );
      return [reaction ? [{ emoji: reaction.emoji }] : []];
    }

    if (sql.includes("COUNT(*) AS reaction_count")) {
      const [memberType, memberId, roomId, ...messageIds] = params;
      const matching = reactions.filter(
        (item) =>
          Number(item.room_id) === Number(roomId) &&
          messageIds.some(
            (id) => Number(id) === Number(item.message_id),
          ) &&
          item.emoji !== null,
      );
      const groups = new Map();
      matching.forEach((item) => {
        const key = `${item.message_id}:${item.emoji}`;
        const group = groups.get(key) || {
          message_id: item.message_id,
          emoji: item.emoji,
          reaction_count: 0,
          reacted_by_me: 0,
        };
        group.reaction_count += 1;
        if (
          item.member_type === memberType &&
          Number(item.member_id) === Number(memberId)
        ) {
          group.reacted_by_me = 1;
        }
        groups.set(key, group);
      });
      return [Array.from(groups.values())];
    }

    throw new Error(`Unexpected room chat query: ${sql}`);
  },
});

test("a sender can delete their own message for everyone", () => {
  const message = {
    room_id: 7,
    sender_id: 12,
    sender_type: "student",
  };

  assert.equal(
    getRoomMessageDeleteScope(message, 7, { id: 12, type: "student" }),
    "everyone",
  );
});

test("officer-to-student role changes preserve the same room chat identity", () => {
  const message = {
    room_id: 7,
    sender_id: 12,
    sender_type: "officer",
  };

  assert.equal(getRoomChatActorType("officer"), "member");
  assert.equal(getRoomChatActorType("student"), "member");
  assert.equal(
    getRoomMessageDeleteScope(message, 7, { id: 12, type: "student" }),
    "everyone",
  );
  assert.equal(
    getRoomMessageDeleteScope(message, 7, { id: 12, type: "admin" }),
    "member",
  );
});

test("a different member can hide a message only from their own view", () => {
  const message = {
    room_id: 7,
    sender_id: 12,
    sender_type: "student",
  };

  assert.equal(
    getRoomMessageDeleteScope(message, 7, { id: 13, type: "student" }),
    "member",
  );
});

test("messages from another room cannot be deleted or hidden through this room", () => {
  const roomAMessage = {
    room_id: 7,
    sender_id: 12,
    sender_type: "student",
  };
  const roomBMessage = {
    room_id: 8,
    sender_id: 12,
    sender_type: "student",
  };

  assert.equal(
    getRoomMessageDeleteScope(roomBMessage, 7, { id: 12, type: "student" }),
    null,
  );
  assert.equal(
    getRoomMessageDeleteScope(roomAMessage, 8, { id: 12, type: "student" }),
    null,
  );
});

test("reactions are unique per member, toggle off, and stay in their room", async () => {
  const reactions = [];
  const connection = createRoomChatConnection(
    [
      { room_id: 7, message_id: 70 },
      { room_id: 8, message_id: 80 },
    ],
    reactions,
  );
  const member = { id: 12, type: "student" };

  assert.deepEqual(
    await toggleRoomMessageReaction(connection, 7, 70, member, "👍"),
    { activeEmoji: "👍" },
  );
  assert.deepEqual(
    await toggleRoomMessageReaction(connection, 7, 70, member, "❤️"),
    { activeEmoji: "❤️" },
  );
  assert.deepEqual(
    await toggleRoomMessageReaction(connection, 7, 70, member, "❤️"),
    { activeEmoji: null },
  );
  assert.equal(
    await toggleRoomMessageReaction(connection, 7, 80, member, "😂"),
    null,
  );
  assert.deepEqual(
    await toggleRoomMessageReaction(connection, 8, 80, member, "😂"),
    { activeEmoji: "😂" },
  );

  await toggleRoomMessageReaction(
    connection,
    7,
    70,
    { id: 13, type: "officer" },
    "👍",
  );
  const roomReactions = await getRoomMessageReactions(
    connection,
    7,
    [70, 80],
    member,
  );
  assert.deepEqual(roomReactions.get(70), [
    { emoji: "👍", count: 1, reacted_by_me: false },
  ]);
  assert.equal(roomReactions.has(80), false);
});

test("hidden messages cannot receive reactions from that member", async () => {
  const connection = createRoomChatConnection(
    [{ room_id: 7, message_id: 70 }],
    [],
    [{ room_id: 7, message_id: 70, member_type: "member", member_id: 12 }],
  );

  assert.equal(
    await toggleRoomMessageReaction(
      connection,
      7,
      70,
      { id: 12, type: "student" },
      "👍",
    ),
    null,
  );
});

