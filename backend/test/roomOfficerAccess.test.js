import test from "node:test";
import assert from "node:assert/strict";
import { clearOrphanedOfficerStatus } from "../utils/shared/roomOfficerAccess.js";

test("deleting a room clears account-wide status without an officer membership elsewhere", async () => {
  const students = new Map([
    [101, { position: "Mayor", role: "officer", can_edit: 1 }],
    [202, { position: "Secretary", role: "officer", can_edit: 1 }],
    [303, { position: "Treasurer", role: "officer", can_edit: 1 }],
  ]);
  const remainingMemberships = [
    { room_id: 20, member_id: 202, member_type: "officer" },
    { room_id: 30, member_id: 303, member_type: "student" },
  ];
  const connection = {
    query: async (sql, [memberIds]) => {
      assert.match(sql, /s\.student_id IN \(\?\)/);
      assert.match(sql, /NOT EXISTS/);
      for (const memberId of memberIds) {
        const hasOtherOfficerRoom = remainingMemberships.some(
          (membership) =>
            membership.member_id === memberId &&
            membership.member_type === "officer",
        );
        if (!hasOtherOfficerRoom) {
          students.set(memberId, {
            position: "Student",
            role: null,
            can_add: 0,
            can_edit: 0,
            can_delete: 0,
            can_moderate: 0,
          });
        }
      }
    },
  };

  await clearOrphanedOfficerStatus(connection, [101, 202, 303, 101, "bad"]);

  assert.deepEqual(students.get(101), {
    position: "Student",
    role: null,
    can_add: 0,
    can_edit: 0,
    can_delete: 0,
    can_moderate: 0,
  });
  assert.equal(students.get(202).role, "officer");
  assert.equal(students.get(303).role, null);
});

test("no room officer IDs means no account-wide role update", async () => {
  let queryCount = 0;
  await clearOrphanedOfficerStatus(
    { query: async () => queryCount++ },
    [],
  );
  assert.equal(queryCount, 0);
});
