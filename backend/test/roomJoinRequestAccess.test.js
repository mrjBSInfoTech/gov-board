import test from "node:test";
import assert from "node:assert/strict";
import { canReviewRoomJoinRequests } from "../utils/shared/roomJoinRequestAccess.js";

test("only admins and officers in the exact room can review join requests", () => {
  const roomAOfficer = { roomId: 10, memberType: "officer" };
  const roomBStudent = { roomId: 20, memberType: "student" };
  const roomAAdmin = { roomId: 10, memberType: "admin" };

  assert.equal(canReviewRoomJoinRequests(roomAOfficer, 10), true);
  assert.equal(canReviewRoomJoinRequests(roomAOfficer, 20), false);
  assert.equal(canReviewRoomJoinRequests(roomBStudent, 20), false);
  assert.equal(canReviewRoomJoinRequests(roomAAdmin, 10), true);
});
