export const canEditStudentDetails = (admin) =>
  admin.is_super_admin ||
  admin.position === "College Head" ||
  (admin.position === "Governor" && Boolean(admin.can_edit_students));

export const canDeleteStudent = (admin) =>
  admin.is_super_admin || admin.position === "College Head";

export const canCreateStudentAccount = (admin) =>
  admin.is_super_admin || admin.position === "College Head";

export const canAssignStudentPosition = (admin) =>
  admin.is_super_admin ||
  admin.position === "College Head" ||
  admin.position === "Governor";

export const canManageAdminAccounts = (admin) => admin.is_super_admin;

export const canGrantGovernorEditPermission = (admin, target) =>
  admin.is_super_admin ||
  (admin.position === "College Head" &&
    target.position === "Governor" &&
    typeof admin.college === "string" &&
    typeof target.college === "string" &&
    admin.college.trim() !== "" &&
    admin.college.trim().toLocaleLowerCase() ===
      target.college.trim().toLocaleLowerCase());
