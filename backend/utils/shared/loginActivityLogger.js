import db from "../../database/db.js";
import { logAudit } from "./auditLogger.js";
import { logOfficerAudit } from "../officer/officerAuditLogger.js";
import { awardLoginXp } from "./roomLevelService.js";

export const auditLoginActivity = (officerOnly = false) => (req, res, next) => {
  res.once("finish", async () => {
    try {
      const number = typeof req.body.student_number === "string" ? req.body.student_number.trim() : "";
      const [rows] = await db.promise().query(
        `SELECT student_id, student_number, role FROM student WHERE student_number = ?
         ${officerOnly ? "AND role IS NOT NULL" : ""} LIMIT 1`, [number],
      );
      const account = rows[0];
      const label = (account?.role || officerOnly) ? "Officer" : "Student";
      const event = {
        action: "Login", status: res.statusCode >= 400 ? "Failed" : "Success",
        information: res.statusCode >= 400
          ? (req.loginFailureReason || `Sign-in failed (HTTP ${res.statusCode})`) : `${label} logged in`,
      };
      if (account?.role) {
        await logOfficerAudit(account.student_id, event);
      } else {
        await logAudit({ ...event,
          actor: account ? account.student_number : `Unknown ${officerOnly ? "officer" : "student"}`,
          role: officerOnly ? "Officer" : "Student",
        });
      }
      if (res.statusCode < 400 && account?.student_id) {
        await awardLoginXp(account.student_id);
      }
    } catch (error) {
      console.error("Unable to record sign-in activity:", error.message);
    }
  });
  next();
};
