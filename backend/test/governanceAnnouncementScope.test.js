import test from "node:test";
import assert from "node:assert/strict";
import { getGovernanceAnnouncementDeleteScope } from "../utils/admin/governanceAnnouncementScope.js";

test("college admins can delete only announcements for their own college", () => {
  assert.deepEqual(
    getGovernanceAnnouncementDeleteScope({
      is_super_admin: false,
      college: "CCS",
    }),
    {
      sql: " AND visibility_scope = 'college' AND LOWER(college) = LOWER(?)",
      params: ["CCS"],
    },
  );
});

test("only the Super Admin has no college restriction when deleting announcements", () => {
  assert.deepEqual(
    getGovernanceAnnouncementDeleteScope({
      is_super_admin: true,
      college: null,
    }),
    { sql: "", params: [] },
  );
});
