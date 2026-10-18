import db from "../../database/db.js";
import { logAudit } from "../shared/auditLogger.js";

export async function logStudentAudit(studentId, event) {
  try {
    const [rows] = await db.promise().query(
      "SELECT student_number, first_name, last_name FROM student WHERE student_id = ? LIMIT 1", [studentId],
    );
    if (!rows.length) return false;
    const account = rows[0];
    const information = event.action === "Logout"
      ? "Student logged out"
      : event.information;
    return await logAudit({ ...event, information, actor: account.student_number, role: "Student" });
  } catch (error) {
    console.error("Unable to record student activity:", error.message);
    return false;
  }
}
