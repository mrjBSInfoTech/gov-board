import { logAudit } from "../shared/auditLogger.js";
import { getAuditRoomId } from "../shared/roomAuditScope.js";
import { logStudentAudit } from "./studentAuditLogger.js";
import { logOfficerAudit } from "../officer/officerAuditLogger.js";
import { describeAuditRequest } from "../shared/auditDescription.js";

export function auditStudentActivity(req, res, next) {
  const path = req.path;
  if (path.startsWith("/audit") || path === "/authenticate/login") return next();
  const actions = { POST: "Create", PUT: "Update", PATCH: "Update", DELETE: "Delete" };
  res.once("finish", () => {
    if (req.user?.admin_id) return;
    if (res.statusCode < 400 && (req.method === "GET" || path.startsWith("/authenticate/"))) return;
    const event = {
      action: actions[req.method] || "View",
      status: res.statusCode >= 400 ? "FAILED" : "SUCCESS",
      room_id: getAuditRoomId(req),
      information:
        req.auditInformation ||
        describeAuditRequest(req, res.statusCode),
    };
    if (req.user?.officer_id) {
      void logOfficerAudit(req.user.officer_id, event);
    } else if (req.user?.student_id) {
      void logStudentAudit(req.user.student_id, event);
    }
  });
  next();
}

// Stable student IDs keep history attached to the account after profile edits.
export function auditStudentChanges(req, res, next) {
  const actions = { POST: "Create", PUT: "Update", PATCH: "Update", DELETE: "Delete" };
  const action = actions[req.method];
  const path = req.path;
  if (!action || path.startsWith("/audit") || path.startsWith("/authenticate/")) {
    return next();
  }
  res.once("finish", () => {
    if (!req.user?.student_id || req.user.officer_id || req.user.admin_id ||
        res.statusCode < 200 || res.statusCode >= 300) return;
    void logAudit({
      action,
      actor: `Student ${req.user.student_id}`,
      role: "Student",
      status: "Success",
      room_id: getAuditRoomId(req),
      information: `${req.method} ${path}`,
    });
  });
  next();
}
