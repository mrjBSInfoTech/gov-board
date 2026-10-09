export const GOVERNANCE_SECTIONS = [
  { key: "audit", title: "Audit" },
  { key: "budget", title: "Budget" },
  { key: "funds", title: "Funds" },
  { key: "event-handlers", title: "Event Handlers" },
  { key: "moderate", title: "Moderate" },
];

const ALL_SECTIONS = GOVERNANCE_SECTIONS.map(({ key }) => key);

const POSITION_ACCESS = {
  mayor: ALL_SECTIONS,
  "vice-mayor": ALL_SECTIONS,
  secretary: ALL_SECTIONS,
  treasurer: ["funds", "budget"],
  auditor: ["funds", "budget", "audit"],
  pio: ["event-handlers"],
  "protocol-officer": ["audit", "moderate"],
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
