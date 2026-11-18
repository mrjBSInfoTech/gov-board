import { describeAuditRequest } from "../shared/auditDescription.js";

const adminMutationPath =
  /^\/(accounts|students|rooms|calendar|governance-announcements)(?:\/|$)/;
const mutationActions = {
  POST: "Create",
  PUT: "Update",
  PATCH: "Update",
  DELETE: "Delete",
};

const parseId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const createAdminAuditEvent = (req, statusCode) => {
  const action = mutationActions[req.method];
  const path = req.path || "";
  const pathMatch = path.match(adminMutationPath);
  if (!action || !pathMatch || !req.user) return null;

  const collection = pathMatch[1];
  const targetId =
    parseId(req.auditTargetId) ??
    parseId(
      path.match(
        /^\/(?:accounts|students|rooms|calendar|governance-announcements)\/(?:admins\/)?(\d+)(?:\/|$)/,
      )?.[1],
    );
  const succeeded = statusCode >= 200 && statusCode < 300;
  const eventAction = path.endsWith("/promote")
    ? "Promote"
    : path.endsWith("/demote")
      ? "Demote"
      : action;
  const roomId = succeeded
    ? parseId(
        req.auditRoomId ??
          (collection === "rooms" ? targetId : null) ??
          (/^\/(?:students\/\d+\/(?:promote|demote)|accounts\/\d+\/demote)$/.test(
            path,
          )
            ? req.body?.roomId
            : null),
      )
    : null;

  return {
    action: eventAction,
    actor: req.user.username || `Admin ${req.user.admin_id}`,
    status: succeeded ? "Success" : "Failed",
    information: describeAuditRequest(req, statusCode, eventAction, targetId),
    room_id: roomId,
  };
};
