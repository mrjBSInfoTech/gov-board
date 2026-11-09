import { PRIMARY_ADMIN_ID } from "./adminScope.js";

export const getAdminRoomAccess = async (database, adminId, roomId) => {
  const [rows] = await database.promise().query(
    `SELECT r.room_id, a.admin_id, a.position, a.college
       FROM room r
       INNER JOIN admin a ON a.admin_id = ?
      WHERE r.room_id = ?
        AND (
          (a.admin_id = ? AND a.position = 'Super Admin')
          OR (
            a.position IN ('Governor', 'College Head')
            AND a.college = r.college
          )
        )
      LIMIT 1`,
    [adminId, roomId, PRIMARY_ADMIN_ID],
  );
  if (!rows.length) return null;

  const admin = rows[0];
  return {
    isSuperAdmin:
      Number(admin.admin_id) === PRIMARY_ADMIN_ID &&
      admin.position === "Super Admin",
    college: admin.college,
  };
};
