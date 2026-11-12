export const GOVERNANCE_SECTIONS = [
  { key: "event-handlers", title: "Event Scheduler" },
  { key: "announcement", title: "Announcement" },
  { key: "moderate", title: "Moderate" },
  { key: "budget", title: "Budget" },
  { key: "funds", title: "Funds" },
  { key: "audit", title: "Audit" },
  { key: "reports", title: "Reports" },
];

const GOVERNANCE_SECTION_KEYS = GOVERNANCE_SECTIONS
  .map(({ key }) => key)
  .filter((key) => key !== "reports");
const ALL_SECTIONS = GOVERNANCE_SECTION_KEYS;
const ALL_SECTIONS_WITH_REPORTS = [...ALL_SECTIONS, "reports"];

const POSITION_ACCESS = {
  mayor: ALL_SECTIONS,
  "vice-mayor": ALL_SECTIONS,
  secretary: ALL_SECTIONS_WITH_REPORTS,
  treasurer: ["funds", "budget"],
  auditor: [...ALL_SECTIONS, "reports"],
  pio: ["event-handlers", "announcement"],
  "protocol-officer": ["moderate"],
};

const normalizePosition = (position) =>
  String(position || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const getGovernanceAccess = (position) =>
  POSITION_ACCESS[normalizePosition(position)] || [];

export const canAccessGovernanceSection = (position, section) =>
  getGovernanceAccess(position).includes(section);

export const canManageGovernanceSection = (position, section) => {
  const normalized = normalizePosition(position);
  if (normalized === "secretary") return false;
  if (normalized === "auditor") return false;
  return canAccessGovernanceSection(normalized, section);
};

export const canGenerateGovernanceReport = (position) =>
  ["auditor", "secretary"].includes(normalizePosition(position));

export const canDownloadGovernanceSectionReport = (position) =>
  normalizePosition(position) === "auditor";
