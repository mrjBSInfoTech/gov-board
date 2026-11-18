export const PRIMARY_ADMIN_ID = 1;

export const getAdminCollegeFilter = (req, column) =>
  req.user.is_super_admin
    ? { sql: "", params: [] }
    : { sql: ` AND ${column} = ?`, params: [req.user.college] };

export const getAdminRoomCollegeFilter = (req, column) => {
  if (req.user.is_super_admin) return { sql: "", params: [] };

  const roomAlias = column.includes(".")
    ? column.slice(0, column.lastIndexOf("."))
    : "room";
  return {
    sql: ` AND (
      LOWER(${column}) = LOWER(?)
      OR ${roomAlias}.all_colleges = 1
      OR EXISTS (
        SELECT 1
          FROM room_college rc
         WHERE rc.room_id = ${roomAlias}.room_id
           AND LOWER(rc.college) = LOWER(?)
      )
    )`,
    params: [req.user.college, req.user.college],
  };
};

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
