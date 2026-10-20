import test from "node:test";
import assert from "node:assert/strict";
import {
  getQuestDateKey,
  getRoomLevelProgress,
} from "../utils/shared/roomQuestRules.js";
import { isRoomMember } from "../utils/shared/roomMembership.js";

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
  });
  assert.deepEqual(getRoomLevelProgress(100), {
    level: 2,
    current_level_exp: 0,
    next_level_exp: 100,
    next_level_total_exp: 200,
  });
  assert.deepEqual(getRoomLevelProgress(250), {
    level: 3,
    current_level_exp: 50,
    next_level_exp: 200,
    next_level_total_exp: 400,
  });
  assert.deepEqual(getRoomLevelProgress(700), {
    level: 5,
    current_level_exp: 0,
    next_level_exp: 500,
    next_level_total_exp: 1200,
  });
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
