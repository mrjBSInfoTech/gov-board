import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdminEventScope,
  getRoomCalendarEventPredicate,
  isCalendarEventVisibleToRoom,
} from "../utils/shared/calendarEventScope.js";

const roomA = { room_id: 10, college: "Engineering" };
const roomB = { room_id: 20, college: "Arts" };

test("room events stay in their exact room while college and global events follow their scope", () => {
  assert.equal(
    isCalendarEventVisibleToRoom(
      { visibility_scope: "room", room_id: 10 },
      roomA,
    ),
    true,
  );
  assert.equal(
    isCalendarEventVisibleToRoom(
      { visibility_scope: "room", room_id: 10 },
      roomB,
    ),
    false,
  );
  assert.equal(
    isCalendarEventVisibleToRoom(
      { visibility_scope: "college", college: "engineering" },
      roomA,
    ),
    true,
  );
  assert.equal(
    isCalendarEventVisibleToRoom(
      { visibility_scope: "college", college: "engineering" },
      roomB,
    ),
    false,
  );
  assert.equal(
    isCalendarEventVisibleToRoom({ visibility_scope: "global" }, roomA),
    true,
  );
  assert.equal(
    isCalendarEventVisibleToRoom({ visibility_scope: "global" }, roomB),
    true,
  );
});

test("admin event scope is determined by the authenticated stakeholder role", () => {
  assert.deepEqual(
    getAdminEventScope({ is_super_admin: true, college: null }),
    { visibilityScope: "global", college: null },
  );
  assert.deepEqual(
    getAdminEventScope({ is_super_admin: false, college: "Engineering" }),
    { visibilityScope: "college", college: "Engineering" },
  );
});

test("the SQL visibility predicate is based on the exact room or its college", () => {
  const predicate = getRoomCalendarEventPredicate();
  assert.match(predicate, /e\.room_id = r\.room_id/);
  assert.match(predicate, /e\.college = r\.college/);
  assert.match(predicate, /e\.visibility_scope = 'global'/);
});
