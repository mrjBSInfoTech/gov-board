import { logAudit } from "../shared/auditLogger.js";
import { createAdminAuditEvent } from "./adminAuditEvent.js";

export function auditAdminChanges(req, res, next) {
  const method = req.method;
  const path = req.path;
  res.once("finish", () => {
    const event = createAdminAuditEvent(
      {
        method,
        path,
        user: req.user,
        body: req.body,
        auditTargetId: req.auditTargetId,
        auditRoomId: req.auditRoomId,
      },
      res.statusCode,
    );
    if (event) void logAudit(event);
  });
  next();
}
