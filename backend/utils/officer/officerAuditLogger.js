import { logAudit } from "../shared/auditLogger.js";
import db from "../../database/db.js";

export async function logOfficerAudit(officerId, event) {
  try {
    const [rows] = await db.promise().query(
      "SELECT student_number, first_name, last_name FROM student WHERE student_id = ? LIMIT 1", [officerId],
    );
    if (!rows.length) return false;
    const account = rows[0];
    const information = event.action === "Logout"
      ? "Officer logged out"
      : event.information;
    return await logAudit({ ...event, information, actor: account.student_number, role: "Officer" });
  } catch (error) {
    console.error("Unable to record officer activity:", error.message);
    return false;
  }
}

export function auditOfficerActivity(req, res, next) {
  const path = req.path;
  if (path.startsWith("/audit") || path === "/authenticate/login") return next();
  const actions = { POST: "Create", PUT: "Update", PATCH: "Update", DELETE: "Delete" };
  res.once("finish", () => {
    if (!req.user?.officer_id || (req.method === "GET" && res.statusCode < 400)) return;
    void logOfficerAudit(req.user.officer_id, {
      action: actions[req.method] || "View",
      status: res.statusCode >= 400 ? "Failed" : "Success",
      information:
        req.auditInformation || `${req.method} ${path} (HTTP ${res.statusCode})`,
    });
  });
  next();
}
