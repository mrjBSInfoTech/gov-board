import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdminEventScope,
  getRoomCollegeMemberVisibilityPredicate,
  getRoomCalendarEventPredicate,
  isCollegeContentVisibleToRoomMember,
  isCollegeIncludedInRoomAudience,
  isCalendarEventVisibleToRoom,
} from "../utils/shared/calendarEventScope.js";

const roomA = {
  room_id: 10,
  all_colleges: false,
  colleges: ["Engineering", "Business"],
};
const roomB = { room_id: 20, all_colleges: false, colleges: ["Arts"] };

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

test("room college audiences include only selected colleges unless configured for all", () => {
  assert.equal(isCollegeIncludedInRoomAudience("engineering", roomA), true);
  assert.equal(isCollegeIncludedInRoomAudience("Arts", roomA), false);
  assert.equal(
    isCollegeIncludedInRoomAudience("Any College", { all_colleges: true }),
    true,
  );
  assert.equal(isCollegeIncludedInRoomAudience("", roomA), false);
});

test("college-targeted content is visible only to matching members in a targeted room", () => {
  assert.equal(
    isCollegeContentVisibleToRoomMember("Engineering", roomA, "engineering"),
    true,
  );
  assert.equal(
    isCollegeContentVisibleToRoomMember("Engineering", roomA, "Arts"),
    false,
  );
  assert.equal(
    isCollegeContentVisibleToRoomMember("Arts", roomA, "Arts"),
    false,
  );
  assert.equal(
    isCollegeContentVisibleToRoomMember(
      "Arts",
      { all_colleges: true },
      "Arts",
    ),
    true,
  );
});

test("SQL visibility predicates keep college-targeted content scoped to selected rooms", () => {
  const predicate = getRoomCalendarEventPredicate();
  assert.match(predicate, /e\.room_id = r\.room_id/);
  assert.match(predicate, /room_college rc/);
  assert.match(predicate, /r\.all_colleges = 1/);
  assert.match(predicate, /e\.visibility_scope = 'global'/);

  const announcementPredicate = getRoomCollegeMemberVisibilityPredicate("ga.college");
  assert.match(announcementPredicate, /room_college rc/);
  assert.match(announcementPredicate, /LOWER\(s\.college\) = LOWER\(ga\.college\)/);
});
