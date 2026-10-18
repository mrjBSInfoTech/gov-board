import { logAudit } from "../shared/auditLogger.js";

// Observe completed admin changes without rewriting their existing handlers.
export function auditAdminChanges(req, res, next) {
  const actions = { POST: "Create", PUT: "Update", PATCH: "Update", DELETE: "Delete" };
  const action = actions[req.method];
  const path = req.path;
  if (!action || !/^\/(accounts|students|rooms)(\/|$)/.test(path)) return next();

  res.once("finish", () => {
    if (!req.user || res.statusCode < 200 || res.statusCode >= 300) return;
    const eventAction = path.endsWith("/promote") ? "Promote"
      : path.endsWith("/demote") ? "Demote" : action;
    void logAudit({
      action: eventAction,
      actor: req.user.username || `Admin ${req.user.admin_id}`,
      status: "Success",
      information: `${req.method} ${path}`,
    });
  });
  next();
}

