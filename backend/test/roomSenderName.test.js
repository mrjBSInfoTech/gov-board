import test from "node:test";
import assert from "node:assert/strict";
import { getRoomSenderName } from "../utils/shared/roomSenderName.js";

test("room sender name comes from the authenticated admin account", async () => {
  let query;
  let params;
  const connection = {
    async query(sql, values) {
      query = sql;
      params = values;
      return [[{ first_name: "John ", last_name: "Doe" }]];
    },
  };

  assert.equal(await getRoomSenderName(connection, "admin", 3), "John Doe");
  assert.match(query, /FROM admin WHERE admin_id = \?/);
  assert.deepEqual(params, [3]);
});

test("room sender name for a room member comes from the student account", async () => {
  let query;
  const connection = {
    async query(sql) {
      query = sql;
      return [[{ first_name: "Chris", last_name: "Beltran" }]];
    },
  };

  assert.equal(
    await getRoomSenderName(connection, "officer", 12),
    "Chris Beltran",
  );
  assert.match(query, /FROM student WHERE student_id = \?/);
});

test("room sender lookup fails explicitly when the account no longer exists", async () => {
  const connection = {
    async query() {
      return [[]];
    },
  };

  assert.equal(await getRoomSenderName(connection, "admin", 3), null);
});
