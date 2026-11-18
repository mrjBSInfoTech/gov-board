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
  { admin_id: 4, position: "Governor", college: "Arts" },
];
const rooms = [
  { room_id: 10, college: "Engineering", all_colleges: 0, colleges: ["Engineering"] },
  { room_id: 20, college: "Arts", all_colleges: 0, colleges: ["Arts"] },
  { room_id: 30, college: null, all_colleges: 1, colleges: [] },
  { room_id: 40, college: "", all_colleges: 1, colleges: [] },
  { room_id: 50, college: null, all_colleges: 0, colleges: ["Engineering"] },
  { room_id: 60, college: null, all_colleges: 0, colleges: ["Arts"] },
  { room_id: 70, college: "Engineering", all_colleges: 1, colleges: [] },
];

const createDatabase = () => ({
  promise: () => ({
    query: async (sql, [adminId, roomId, primaryAdminId]) => {
      assert.match(sql, /r\.room_id = \?/);
      const admin = admins.find((item) => item.admin_id === adminId);
      const room = rooms.find((item) => item.room_id === roomId);
      if (admin?.admin_id !== primaryAdminId) {
        assert.match(sql, /r\.all_colleges = 1/);
        assert.match(sql, /FROM room_college rc/);
      }
      const isSuperAdmin =
        admin?.admin_id === primaryAdminId &&
        admin.position === "Super Admin";
      const isCollegeAdmin =
        ["Governor", "College Head"].includes(admin?.position);
      const ownsRoom =
        room?.college?.trim() &&
        admin?.college?.toLowerCase() === room.college.toLowerCase();
      const matchesAudience =
        room?.all_colleges ||
        room?.colleges.some(
          (college) =>
            college.toLowerCase() === admin?.college?.toLowerCase(),
        );
      const canAccess =
        Boolean(admin && room) &&
        (isSuperAdmin || (isCollegeAdmin && (ownsRoom || matchesAudience)));
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

test("room access respects global and selected-college audiences", async () => {
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
    assert.deepEqual(await getAdminRoomAccess(database, adminId, 50), {
      isSuperAdmin: false,
      college: "Engineering",
      roomCollege: null,
    });
    assert.equal(await getAdminRoomAccess(database, adminId, 60), null);
  }

  assert.deepEqual(await getAdminRoomAccess(database, 4, 60), {
    isSuperAdmin: false,
    college: "Arts",
    roomCollege: null,
  });
  assert.equal(await getAdminRoomAccess(database, 4, 50), null);
  assert.deepEqual(await getAdminRoomAccess(database, 4, 70), {
    isSuperAdmin: false,
    college: "Arts",
    roomCollege: "Engineering",
  });
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
  assert.deepEqual(await getAdminRoomAccess(database, 1, 50), {
    isSuperAdmin: true,
    college: null,
    roomCollege: null,
  });
});

test("room filters permit owned, global, and matching-audience rooms only", () => {
  const req = {
    user: { is_super_admin: false, college: "Engineering" },
  };
  const filter = getAdminRoomCollegeFilter(req, "r.college");
  assert.deepEqual(filter.params, ["Engineering", "Engineering"]);
  assert.match(filter.sql, /LOWER\(r\.college\) = LOWER\(\?\)/);
  assert.match(filter.sql, /r\.all_colleges = 1/);
  assert.match(filter.sql, /rc\.room_id = r\.room_id/);
  assert.match(filter.sql, /LOWER\(rc\.college\) = LOWER\(\?\)/);

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
