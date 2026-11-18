const resourceLabels = {
  accounts: "administrator account",
  students: "student account",
  rooms: "room",
  calendar: "calendar event",
  "governance-announcements": "governance announcement",
  announcements: "announcement",
  budgets: "budget",
  funds: "fund",
  "budget-contributions": "budget contribution",
  contributions: "contribution",
  messages: "room message",
  chat: "chat message",
  "join-requests": "room join request",
  moderation: "room member",
  reports: "governance report",
};

const getResourceLabel = (path) => {
  for (const [key, label] of Object.entries(resourceLabels)) {
    if (path === `/${key}` || path.startsWith(`/${key}/`)) return label;
  }
  return "record";
};

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function describeAuditRequest(req, statusCode, action, targetId = null) {
  const method = String(req.method || "").toUpperCase();
  const path = String(req.path || "");
  const succeeded = statusCode >= 200 && statusCode < 300;
  const baseAction =
    action ||
    ({ POST: "Created", PUT: "Updated", PATCH: "Updated", DELETE: "Deleted" }[method]);

  if (!baseAction) return "";

  let label = getResourceLabel(path);
  if (path.endsWith("/promote")) label = "student account";
  if (path.endsWith("/demote")) label = "student account";

  let phrase;
  if (baseAction === "Promote") phrase = "Promoted a student";
  else if (baseAction === "Demote") phrase = "Demoted a student";
  else {
    const verb = {
      Create: "Created",
      Update: "Updated",
      Delete: "Deleted",
      View: "Viewed",
    }[baseAction] || titleCase(baseAction);

    const article = /^[aeiou]/i.test(label) ? "an" : "a";
    phrase = `${verb} ${article} ${label}`;
  }

  if (targetId) phrase += ` (${label === "room" ? "Room" : "Record"} ${targetId})`;
  if (!succeeded) {
    const failedVerbs = {
      Create: "create",
      Update: "update",
      Delete: "delete",
      View: "view",
      Promote: "promote",
      Demote: "demote",
    };
    const failedVerb = failedVerbs[baseAction];
    if (failedVerb) {
      phrase =
        baseAction === "Promote"
          ? "Unable to promote a student"
          : baseAction === "Demote"
            ? "Unable to demote a student"
            : `Unable to ${failedVerb} ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}`;
    }
  }

  return phrase;
}
