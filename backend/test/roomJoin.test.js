import test from "node:test";
import assert from "node:assert/strict";
import { findRoomByCode } from "../utils/shared/roomJoin.js";

test("room lookup uses only the exact join code and returns room details", async () => {
  const expectedRoom = {
    room_id: 7,
    room_number: "abc-1234",
    room_name: "Science Lab",
    description: "Shared science workspace",
    college: "Science",
  };
  let query;
  let params;
  const connection = {
    async query(sql, values) {
      query = sql;
      params = values;
      return [[expectedRoom]];
    },
  };

  const room = await findRoomByCode(connection, " abc-1234 ");

  assert.deepEqual(room, expectedRoom);
  assert.deepEqual(params, ["abc-1234"]);
  assert.match(query, /WHERE room_number = \?/);
  assert.doesNotMatch(query, /eligible|join_access|room_allowed_college/i);
});

test("room lookup returns null for an unknown code", async () => {
  const connection = {
    async query() {
      return [[]];
    },
  };

  assert.equal(await findRoomByCode(connection, "invalid"), null);
});
