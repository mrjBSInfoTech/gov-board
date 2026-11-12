export const GOVERNANCE_SECTIONS = [
  "audit",
  "budget",
  "funds",
  "event-handlers",
  "announcement",
  "moderate",
];

const normalize = (position) =>
  String(position || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const allSections = new Set([...GOVERNANCE_SECTIONS, "reports"]);
const sectionsByPosition = {
  mayor: allSections,
  "vice-mayor": allSections,
  secretary: allSections,
  treasurer: new Set(["budget", "funds"]),
  auditor: new Set([...GOVERNANCE_SECTIONS, "reports"]),
  pio: new Set(["announcement", "event-handlers"]),
  "protocol-officer": new Set(["moderate"]),
};

export const normalizeGovernancePosition = normalize;

export const canAccessGovernanceSection = (position, section) =>
  sectionsByPosition[normalize(position)]?.has(section) || false;

export const canManageGovernanceSection = (position, section) => {
  const normalized = normalize(position);
  if (normalized === "secretary") return false;
  if (normalized === "auditor") return false;
  return canAccessGovernanceSection(normalized, section);
};

export const canGenerateGovernanceReport = (position) =>
  ["auditor", "secretary"].includes(normalize(position));

export const canDownloadGovernanceSectionReport = (position) =>
  normalize(position) === "auditor";
