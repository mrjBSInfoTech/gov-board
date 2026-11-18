import test from "node:test";
import assert from "node:assert/strict";
import { createAdminAuditEvent } from "../utils/admin/adminAuditEvent.js";

const admin = { username: "admin-one", admin_id: 1 };

test("admin mutation routes create audit events for each managed section", () => {
  for (const path of [
    "/accounts/admins",
    "/students/12/promote",
    "/rooms",
    "/calendar",
    "/governance-announcements",
  ]) {
    const event = createAdminAuditEvent(
      { method: "POST", path, user: admin, auditTargetId: 31 },
      201,
    );
    assert.ok(event, `${path} should be audited`);
    assert.equal(event.status, "Success");
    assert.equal(event.actor, "admin-one");
    assert.doesNotMatch(event.information, /\bPOST\b|\bGET\b|HTTP|\/accounts|\/rooms|\/calendar/);
    assert.match(event.information, /Created|Promoted|Unable to (create|promote)/);
  }
});

test("admin audit events record failed mutations and promotion actions", () => {
  const event = createAdminAuditEvent(
    { method: "POST", path: "/students/12/promote", user: admin },
    403,
  );
  assert.equal(event.action, "Promote");
  assert.equal(event.status, "Failed");
  assert.match(event.information, /Promoted|Unable to promote/);
});

test("admin governance announcement deletions create a readable audit event", () => {
  const event = createAdminAuditEvent(
    {
      method: "DELETE",
      path: "/governance-announcements/18",
      user: admin,
    },
    200,
  );
  assert.equal(event.action, "Delete");
  assert.equal(event.status, "Success");
  assert.match(event.information, /Deleted a governance announcement/);
  assert.match(event.information, /18/);
});

test("admin audit records preserve validated room context without exposing request data", () => {
  const roomUpdate = createAdminAuditEvent(
    { method: "PUT", path: "/rooms/42", user: admin, body: { description: "private" } },
    200,
  );
  assert.equal(roomUpdate.room_id, 42);
  assert.doesNotMatch(roomUpdate.information, /private/);

  const roomPromotion = createAdminAuditEvent(
    {
      method: "POST",
      path: "/students/12/promote",
      user: admin,
      body: { roomId: "42", password: "do-not-log" },
    },
    201,
  );
  assert.equal(roomPromotion.room_id, 42);
  assert.doesNotMatch(roomPromotion.information, /do-not-log/);

  const failedRoomAction = createAdminAuditEvent(
    {
      method: "POST",
      path: "/students/12/promote",
      user: admin,
      body: { roomId: "42" },
    },
    404,
  );
  assert.equal(failedRoomAction.room_id, null);
});

test("admin audit ignores reads, audit endpoints, and unauthenticated requests", () => {
  assert.equal(
    createAdminAuditEvent({ method: "GET", path: "/rooms", user: admin }, 200),
    null,
  );
  assert.equal(
    createAdminAuditEvent({ method: "POST", path: "/audit", user: admin }, 201),
    null,
  );
  assert.equal(
    createAdminAuditEvent({ method: "DELETE", path: "/rooms/42" }, 401),
    null,
  );
});
