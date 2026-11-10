import test from "node:test";
import assert from "node:assert/strict";
import { getAdminRoomAccess } from "../utils/shared/adminRoomAccess.js";
import {
  getAdminCollegeFilter,
  getAdminRoomCollegeFilter,
  resolveAdminCollege,
} from "../utils/shared/adminScope.js";

const admins = [
  { admin_id: 1, position: "Super Admin", college: null },
  { admin_id: 2, position: "College Head", college: "Engineering" },
  { admin_id: 3, position: "Governor", college: "Engineering" },
];
const rooms = [
  { room_id: 10, college: "Engineering" },
  { room_id: 20, college: "Arts" },
  { room_id: 30, college: null },
  { room_id: 40, college: "" },
];

const createDatabase = () => ({
  promise: () => ({
    query: async (sql, [adminId, roomId, primaryAdminId]) => {
      assert.match(sql, /r\.room_id = \?/);
      assert.match(sql, /NULLIF\(TRIM\(r\.college\), ''\) IS NULL/);
      const admin = admins.find((item) => item.admin_id === adminId);
      const room = rooms.find((item) => item.room_id === roomId);
      const canAccess =
        admin &&
        room &&
        ((admin.admin_id === primaryAdminId &&
          admin.position === "Super Admin") ||
          (["Governor", "College Head"].includes(admin.position) &&
          (!room.college?.trim() || admin.college === room.college)));
      return [[
        ...(canAccess
        ? [{ ...room, room_college: room.college, ...admin }]
          : []),
      ]];
    },
  }),
});

test("admin room access is limited to the assigned college", async () => {
  const database = createDatabase();
  assert.deepEqual(await getAdminRoomAccess(database, 2, 10), {
    isSuperAdmin: false,
    college: "Engineering",
    roomCollege: "Engineering",
  });
  assert.equal(await getAdminRoomAccess(database, 2, 20), null);
  assert.equal(await getAdminRoomAccess(database, 2, 999), null);
});

test("Governors and College Heads can access rooms without an assigned college", async () => {
  const database = createDatabase();
  for (const adminId of [2, 3]) {
    assert.deepEqual(await getAdminRoomAccess(database, adminId, 30), {
      isSuperAdmin: false,
      college: "Engineering",
      roomCollege: null,
    });
    assert.deepEqual(await getAdminRoomAccess(database, adminId, 40), {
      isSuperAdmin: false,
      college: "Engineering",
      roomCollege: "",
    });
  }
});

test("only the primary Super Admin can access rooms across colleges", async () => {
  const database = createDatabase();
  assert.deepEqual(await getAdminRoomAccess(database, 1, 10), {
    isSuperAdmin: true,
    college: null,
    roomCollege: "Engineering",
  });
  assert.deepEqual(await getAdminRoomAccess(database, 1, 20), {
    isSuperAdmin: true,
    college: null,
    roomCollege: "Arts",
  });
  assert.deepEqual(await getAdminRoomAccess(database, 1, 30), {
    isSuperAdmin: true,
    college: null,
    roomCollege: null,
  });
});

test("room filters permit assigned-college rooms and unassigned rooms only", () => {
  const req = {
    user: { is_super_admin: false, college: "Engineering" },
  };
  assert.deepEqual(getAdminRoomCollegeFilter(req, "r.college"), {
    sql: " AND (NULLIF(TRIM(r.college), '') IS NULL OR r.college = ?)",
    params: ["Engineering"],
  });

  const superAdminReq = {
    user: { is_super_admin: true, college: null },
  };
  assert.deepEqual(getAdminRoomCollegeFilter(superAdminReq, "r.college"), {
    sql: "",
    params: [],
  });
});

test("college admins cannot query or assign records outside their college", () => {
  const req = {
    user: { is_super_admin: false, college: "Engineering" },
  };
  assert.deepEqual(getAdminCollegeFilter(req, "s.college"), {
    sql: " AND s.college = ?",
    params: ["Engineering"],
  });
  assert.equal(resolveAdminCollege(req, " engineering "), "Engineering");
  assert.equal(resolveAdminCollege(req, "Arts"), null);
});

test("the primary Super Admin can query and assign any college", () => {
  const req = {
    user: { is_super_admin: true, college: null },
  };
  assert.deepEqual(getAdminCollegeFilter(req, "s.college"), {
    sql: "",
    params: [],
  });
  assert.equal(resolveAdminCollege(req, "Arts"), "Arts");
});
