import test from "node:test";
import assert from "node:assert/strict";
import { getAdminRoomAccess } from "../utils/shared/adminRoomAccess.js";
import {
  getAdminCollegeFilter,
  resolveAdminCollege,
} from "../utils/shared/adminScope.js";

const admins = [
  { admin_id: 1, position: "Super Admin", college: null },
  { admin_id: 2, position: "College Head", college: "Engineering" },
];
const rooms = [
  { room_id: 10, college: "Engineering" },
  { room_id: 20, college: "Arts" },
];

const createDatabase = () => ({
  promise: () => ({
    query: async (sql, [adminId, roomId, primaryAdminId]) => {
      assert.match(sql, /r\.room_id = \?/);
      const admin = admins.find((item) => item.admin_id === adminId);
      const room = rooms.find((item) => item.room_id === roomId);
      const canAccess =
        admin &&
        room &&
        ((admin.admin_id === primaryAdminId &&
          admin.position === "Super Admin") ||
          (["Governor", "College Head"].includes(admin.position) &&
            admin.college === room.college));
      return [[
        ...(canAccess
          ? [{ ...room, ...admin }]
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
  });
  assert.equal(await getAdminRoomAccess(database, 2, 20), null);
  assert.equal(await getAdminRoomAccess(database, 2, 999), null);
});

test("only the primary Super Admin can access rooms across colleges", async () => {
  const database = createDatabase();
  assert.deepEqual(await getAdminRoomAccess(database, 1, 10), {
    isSuperAdmin: true,
    college: null,
  });
  assert.deepEqual(await getAdminRoomAccess(database, 1, 20), {
    isSuperAdmin: true,
    college: null,
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
