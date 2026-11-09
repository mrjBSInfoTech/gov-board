import test from "node:test";
import assert from "node:assert/strict";
import {
  canAssignStudentPosition,
  canCreateStudentAccount,
  canDeleteStudent,
  canEditStudentDetails,
  canGrantGovernorEditPermission,
  canManageAdminAccounts,
} from "../utils/shared/adminPermissions.js";

const superAdmin = {
  is_super_admin: true,
  position: "Super Admin",
  college: null,
};
const collegeHead = {
  is_super_admin: false,
  position: "College Head",
  college: "Engineering",
};
const governor = {
  is_super_admin: false,
  position: "Governor",
  college: "Engineering",
  can_edit_students: false,
};

test("Super Admin has all stakeholder permissions", () => {
  assert.equal(canEditStudentDetails(superAdmin), true);
  assert.equal(canDeleteStudent(superAdmin), true);
  assert.equal(canCreateStudentAccount(superAdmin), true);
  assert.equal(canAssignStudentPosition(superAdmin), true);
  assert.equal(canManageAdminAccounts(superAdmin), true);
});

test("College Head manages student records and grants same-college Governor edit access", () => {
  assert.equal(canEditStudentDetails(collegeHead), true);
  assert.equal(canDeleteStudent(collegeHead), true);
  assert.equal(canCreateStudentAccount(collegeHead), true);
  assert.equal(canManageAdminAccounts(collegeHead), false);
  assert.equal(
    canGrantGovernorEditPermission(collegeHead, {
      position: "Governor",
      college: "engineering",
    }),
    true,
  );
  assert.equal(
    canGrantGovernorEditPermission(collegeHead, {
      position: "Governor",
      college: "Arts",
    }),
    false,
  );
  assert.equal(
    canGrantGovernorEditPermission(
      { ...collegeHead, college: null },
      { position: "Governor", college: null },
    ),
    false,
  );
});

test("Governor may assign positions but only edit details when granted permission", () => {
  assert.equal(canEditStudentDetails(governor), false);
  assert.equal(canDeleteStudent(governor), false);
  assert.equal(canCreateStudentAccount(governor), false);
  assert.equal(canAssignStudentPosition(governor), true);
  assert.equal(canManageAdminAccounts(governor), false);
  assert.equal(canEditStudentDetails({ ...governor, can_edit_students: true }), true);
});
