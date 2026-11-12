import test from "node:test";
import assert from "node:assert/strict";
import { buildGovernanceReportCsv } from "../utils/officer/governanceReportCsv.js";

test("Governance CSV contains each report section and quotes cell values", () => {
  const csv = buildGovernanceReportCsv({
    announcements: [{ announcement_id: 1, announcement_body: 'Meeting, "today"', link: null }],
    events: [{ event_id: 2, title: "Budget meeting" }],
    budgets: [{ budget_id: 6, budget_name: "New computers", planned_amount: 500 }],
    funds: [{ fund_id: 3, fund_name: "Room fund", target_amount: 500 }],
    contributions: [{ contribution_id: 4, member_name: "Alex", amount: 100 }],
    members: [{ member_id: 7, member_name: "Alex Member" }],
    audit: [{ audit_id: 5, actor: "Officer", information: "Approved" }],
  });

  for (const section of [
    "Announcements",
    "Events",
    "Budget Plans",
    "Funds",
    "Fund Contributions",
    "Room Members",
    "Audit",
  ]) {
    assert.ok(csv.includes(`"${section}"`));
  }
  assert.ok(csv.includes('"Meeting, ""today"""'));
  assert.ok(csv.startsWith("\uFEFF"));
});

test("Governance CSV can export one selected page section", () => {
  const csv = buildGovernanceReportCsv(
    {
      announcements: [{ announcement_body: "Room update" }],
      funds: [{ fund_name: "Room fund" }],
    },
    "announcement",
  );

  assert.ok(csv.includes('"Announcements"'));
  assert.ok(!csv.includes('"Funds"'));
});

test("Governance CSV neutralizes formula-like values", () => {
  const csv = buildGovernanceReportCsv({
    announcements: [{ announcement_body: "  =HYPERLINK(\"https://example.test\")" }],
    events: [{ title: "+SUM(1,1)" }],
    funds: [],
    contributions: [],
    audit: [],
  });

  assert.ok(csv.includes(`"'  =HYPERLINK(""https://example.test"")"`));
  assert.ok(csv.includes(`"'+SUM(1,1)"`));
});
