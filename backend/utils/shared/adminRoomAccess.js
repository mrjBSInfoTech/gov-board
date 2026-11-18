import { PRIMARY_ADMIN_ID } from "./adminScope.js";

export const getAdminRoomAccess = async (database, adminId, roomId) => {
  const [rows] = await database.promise().query(
    `SELECT r.room_id, r.college AS room_college,
            r.all_colleges,
            a.admin_id, a.position, a.college
       FROM room r
       INNER JOIN admin a ON a.admin_id = ?
      WHERE r.room_id = ?
        AND (
          (a.admin_id = ? AND a.position = 'Super Admin')
          OR (
            a.position IN ('Governor', 'College Head')
            AND (
              LOWER(r.college) = LOWER(a.college)
              OR r.all_colleges = 1
              OR EXISTS (
                SELECT 1
                  FROM room_college rc
                 WHERE rc.room_id = r.room_id
                   AND LOWER(rc.college) = LOWER(a.college)
              )
            )
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
    roomCollege: admin.room_college,
  };
};
