import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoomCollegeTargets } from "../utils/shared/roomCollegeAudience.js";

test("room college audience accepts custom college names and trims whitespace", () => {
  assert.deepEqual(
    normalizeRoomCollegeTargets([" New College ", "College of Arts"]),
    ["New College", "College of Arts"],
  );
});

test("room college audience removes case-insensitive duplicates", () => {
  assert.deepEqual(
    normalizeRoomCollegeTargets(["Engineering", " engineering "]),
    ["Engineering"],
  );
});

test("room college audience rejects empty, non-string, and overlong names", () => {
  assert.equal(normalizeRoomCollegeTargets([""]), null);
  assert.equal(normalizeRoomCollegeTargets([null]), null);
  assert.equal(normalizeRoomCollegeTargets(["x".repeat(151)]), null);
});
