import { logAudit } from "../shared/auditLogger.js";
import { createAdminAuditEvent } from "./adminAuditEvent.js";

export function auditAdminChanges(req, res, next) {
  res.once("finish", () => {
    const event = createAdminAuditEvent(req, res.statusCode);
    if (event) void logAudit(event);
  });
  next();
}
