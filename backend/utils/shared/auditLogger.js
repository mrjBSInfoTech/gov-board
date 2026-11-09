import db from "../../database/db.js";

export async function logAudit({
  action,
  actor,
  role = "Admin",
  status,
  information = "",
  room_id = null,
}) {
  try {
    await db.promise().query(
      `INSERT INTO audit_logs
        (datetime, action, actor, role, status, information, room_id)
       VALUES (NOW(), ?, ?, ?, ?, ?, ?)`,
      [action, actor, role, status, information, room_id],
    );
    return true;
  } catch (error) {
    console.error("Failed to record audit event:", error.message);
    return false;
  }
}
