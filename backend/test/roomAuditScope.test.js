import test from "node:test";
import assert from "node:assert/strict";
import { getAuditRoomId } from "../utils/shared/roomAuditScope.js";

test("room audit requests use their explicit room identifier", () => {
  assert.equal(getAuditRoomId({ query: { roomId: "10" } }), 10);
  assert.equal(getAuditRoomId({ body: { room_id: 20 } }), 20);
  assert.equal(getAuditRoomId({ auditRoomId: 30 }), 30);
});

test("room chat audit requests derive the room from their exact route", () => {
  assert.equal(
    getAuditRoomId({ originalUrl: "/api/rooms/41/messages?limit=10" }),
    41,
  );
  assert.equal(
    getAuditRoomId({ originalUrl: "/api/rooms/42/messages/7/media" }),
    42,
  );
  assert.equal(getAuditRoomId({ originalUrl: "/api/rooms/not-a-room/messages" }), null);
});

test("invalid or absent room identifiers do not become room-scoped audit records", () => {
  assert.equal(getAuditRoomId({ query: { roomId: "0" } }), null);
  assert.equal(getAuditRoomId({ query: { roomId: "1.5" } }), null);
  assert.equal(getAuditRoomId({}), null);
});
