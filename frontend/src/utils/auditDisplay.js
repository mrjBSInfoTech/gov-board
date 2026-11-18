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
  reports: "governance report",
};

export function formatAuditInformation(log) {
  const raw = String(log?.information || "").trim();
  if (!raw) return "No additional details";

  const protocolMatch = raw.match(
    /^([A-Z]+)\s+(\/[^ ]+)(?:\s+\((?:record|Record)\s+\d+\))?(?:\s+\(HTTP\s+\d+\))?$/,
  );
  if (protocolMatch) {
    const [, method, path] = protocolMatch;
    const segment = path.split("/").filter(Boolean)[0] || "";
    const label = resourceLabels[segment] || "record";
    const article = /^[aeiou]/i.test(label) ? "an" : "a";
    const verb = {
      POST: "Created",
      PUT: "Updated",
      PATCH: "Updated",
      DELETE: "Deleted",
      GET: "Viewed",
    }[method] || "Processed";

    const isFailed = ["failed", "error"].includes(String(log.status).toLowerCase());
    const detail = `${verb} ${article} ${label}`;
    return isFailed ? `Unable to ${detail.charAt(0).toLowerCase()}${detail.slice(1)}` : detail;
  }

  return raw
    .replace(/\b(POST|PUT|PATCH|DELETE|GET)\s+\/[^ ]+/g, "the selected record")
    .replace(/\bHTTP\s+\d{3}\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
