import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessRoomModeration,
  canModerateTarget,
  canPromoteToPosition,
  MUTE_DURATIONS,
} from "../utils/officer/roomModeration.js";

test("only Mayor, Vice-Mayor, and Protocol Officer can access room moderation", () => {
  assert.equal(canAccessRoomModeration("Mayor"), true);
  assert.equal(canAccessRoomModeration("Vice Mayor"), true);
  assert.equal(canAccessRoomModeration("Protocol Officer"), true);
  assert.equal(canAccessRoomModeration("Secretary"), false);
});

test("Mayor can manage all lower officer ranks and students, but not self", () => {
  assert.equal(
    canModerateTarget("Mayor", "kick", { memberType: "officer", position: "Vice-Mayor" }, 1, 2),
    true,
  );
  assert.equal(
    canModerateTarget("Mayor", "demote", { memberType: "officer", position: "Auditor" }, 1, 2),
    true,
  );
  assert.equal(
    canModerateTarget("Mayor", "kick", { memberType: "student", position: "Student" }, 1, 1),
    false,
  );
});

test("Vice-Mayor actions are restricted to lower positions", () => {
  assert.equal(
    canModerateTarget("Vice-Mayor", "kick", { memberType: "officer", position: "Secretary" }, 1, 2),
    true,
  );
  assert.equal(
    canModerateTarget("Vice-Mayor", "kick", { memberType: "officer", position: "Mayor" }, 1, 2),
    false,
  );
  assert.equal(
    canModerateTarget("Vice-Mayor", "demote", { memberType: "officer", position: "Vice-Mayor" }, 1, 2),
    false,
  );
});

test("Protocol Officer can kick all except Mayor and mute everyone except Mayor and Vice-Mayor", () => {
  assert.equal(
    canModerateTarget("Protocol Officer", "kick", { memberType: "officer", position: "Vice-Mayor" }, 1, 2),
    true,
  );
  assert.equal(
    canModerateTarget("Protocol Officer", "kick", { memberType: "officer", position: "Mayor" }, 1, 2),
    false,
  );
  assert.equal(
    canModerateTarget("Protocol Officer", "mute", { memberType: "student", position: "Student" }, 1, 2),
    true,
  );
  assert.equal(
    canModerateTarget("Protocol Officer", "mute", { memberType: "officer", position: "Vice-Mayor" }, 1, 2),
    false,
  );
  assert.equal(
    canModerateTarget("Protocol Officer", "mute", { memberType: "officer", position: "Protocol Officer" }, 1, 1),
    false,
  );
});

test("Vice-Mayor and Mayor can promote only into positions below their own rank", () => {
  const student = { memberType: "student", position: "Student" };
  assert.equal(canPromoteToPosition("Mayor", student, "Vice-Mayor"), true);
  assert.equal(canPromoteToPosition("Mayor", student, "Mayor"), false);
  assert.equal(canPromoteToPosition("Vice-Mayor", student, "Secretary"), true);
  assert.equal(canPromoteToPosition("Vice-Mayor", student, "Vice-Mayor"), false);
  assert.equal(
    canPromoteToPosition("Mayor", { memberType: "officer", position: "Auditor" }, "Treasurer"),
    true,
  );
  assert.equal(
    canPromoteToPosition("Mayor", { memberType: "officer", position: "Secretary" }, "Treasurer"),
    false,
  );
});

test("mute durations are limited to the configured choices and never exceed one day", () => {
  assert.deepEqual(MUTE_DURATIONS, [30, 60, 180, 720, 1440]);
  assert.ok(MUTE_DURATIONS.every((minutes) => minutes <= 1440));
});
