export const PRIMARY_ADMIN_ID = 1;

export const getAdminCollegeFilter = (req, column) =>
  req.user.is_super_admin
    ? { sql: "", params: [] }
    : { sql: ` AND ${column} = ?`, params: [req.user.college] };

export const resolveAdminCollege = (req, requestedCollege) => {
  const requested = String(requestedCollege ?? "").trim();
  if (req.user.is_super_admin) return requested;
  if (
    requested &&
    requested.toLocaleLowerCase() !== req.user.college.toLocaleLowerCase()
  ) {
    return null;
  }
  return req.user.college;
};
