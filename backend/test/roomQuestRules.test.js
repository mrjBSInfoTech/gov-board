import test from "node:test";
import assert from "node:assert/strict";
import {
  getQuestDateKey,
  getRoomLevelProgress,
} from "../utils/shared/roomQuestRules.js";
import {
  hasRoomMembership,
  isRoomMember,
} from "../utils/shared/roomMembership.js";

test("daily quest date changes at 4:00 AM in the configured timezone", () => {
  assert.equal(
    getQuestDateKey(new Date("2026-10-20T19:59:59.000Z"), "Asia/Manila"),
    "2026-10-20",
  );
  assert.equal(
    getQuestDateKey(new Date("2026-10-20T20:00:00.000Z"), "Asia/Manila"),
    "2026-10-21",
  );
});

test("room level costs follow the Fibonacci-style progression", () => {
  assert.deepEqual(getRoomLevelProgress(0), {
    level: 1,
    current_level_exp: 0,
    next_level_exp: 100,
    next_level_total_exp: 100,
    max_level_reached: false,
    reactions_unlocked: false,
  });
  assert.deepEqual(getRoomLevelProgress(100), {
    level: 2,
    current_level_exp: 0,
    next_level_exp: 100,
    next_level_total_exp: 200,
    max_level_reached: false,
    reactions_unlocked: false,
  });
  assert.deepEqual(getRoomLevelProgress(250), {
    level: 3,
    current_level_exp: 50,
    next_level_exp: 200,
    next_level_total_exp: 400,
    max_level_reached: false,
    reactions_unlocked: false,
  });
  assert.deepEqual(getRoomLevelProgress(700), {
    level: 5,
    current_level_exp: 0,
    next_level_exp: 500,
    next_level_total_exp: 1200,
    max_level_reached: false,
    reactions_unlocked: true,
  });
});

test("room level caps at 20 while EXP continues accumulating", () => {
  assert.equal(getRoomLevelProgress(400).reactions_unlocked, false);
  assert.equal(getRoomLevelProgress(700).reactions_unlocked, true);

  let progress = getRoomLevelProgress(0);
  let totalExp = 0;

  while (progress.level < 20) {
    totalExp = progress.next_level_total_exp;
    progress = getRoomLevelProgress(totalExp);
  }

  assert.equal(progress.level, 20);
  assert.equal(progress.max_level_reached, true);
  assert.equal(progress.current_level_exp, progress.next_level_exp);

  const beyondCap = getRoomLevelProgress(
    totalExp + progress.next_level_exp * 10,
  );
  assert.equal(beyondCap.level, 20);
  assert.equal(beyondCap.max_level_reached, true);
  assert.equal(beyondCap.reactions_unlocked, true);
});

test("room membership is isolated by room for both members", async () => {
  const memberships = [
    { room_id: 10, member_id: 101, member_type: "student" },
    { room_id: 20, member_id: 202, member_type: "officer" },
  ];
  const database = {
    promise: () => ({
      query: async (sql, [roomId, memberId, memberType]) => {
        assert.match(
          sql,
          /WHERE room_id = \? AND member_id = \? AND member_type = \?/,
        );
        return [
          memberships.filter(
            (membership) =>
              membership.room_id === roomId &&
              membership.member_id === memberId &&
              membership.member_type === memberType,
          ),
        ];
      },
    }),
  };

  assert.equal(await isRoomMember(database, 10, 101, "student"), true);
  assert.equal(await isRoomMember(database, 20, 101, "student"), false);
  assert.equal(await isRoomMember(database, 20, 202, "officer"), true);
  assert.equal(await isRoomMember(database, 10, 202, "officer"), false);
});

test("room access accepts either room-specific member type without crossing rooms", async () => {
  const memberships = [
    { room_id: 10, member_id: 101, member_type: "student" },
    { room_id: 20, member_id: 101, member_type: "officer" },
  ];
  const database = {
    promise: () => ({
      query: async (sql, [roomId, memberId]) => {
        assert.match(sql, /WHERE room_id = \? AND member_id = \? LIMIT 1/);
        return [
          memberships.filter(
            (membership) =>
              membership.room_id === roomId &&
              membership.member_id === memberId,
          ),
        ];
      },
    }),
  };

  assert.equal(await hasRoomMembership(database, 10, 101), true);
  assert.equal(await hasRoomMembership(database, 20, 101), true);
  assert.equal(await hasRoomMembership(database, 30, 101), false);
  assert.equal(await hasRoomMembership(database, 10, 202), false);
});
