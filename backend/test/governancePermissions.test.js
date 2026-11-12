import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessGovernanceSection,
  canDownloadGovernanceSectionReport,
  canGenerateGovernanceReport,
  canManageGovernanceSection,
} from "../utils/officer/governancePermissions.js";

test("Mayor and Vice Mayor can access and manage Governance sections", () => {
  for (const position of ["Mayor", "Vice Mayor"]) {
    for (const section of [
      "audit",
      "budget",
      "funds",
      "event-handlers",
      "announcement",
      "moderate",
    ]) {
      assert.equal(canAccessGovernanceSection(position, section), true);
      assert.equal(canManageGovernanceSection(position, section), true);
    }
    assert.equal(canGenerateGovernanceReport(position), false);
  }
});

test("Secretary has read-only access to all sections and can download only the combined report", () => {
  for (const section of [
    "audit",
    "budget",
    "funds",
    "event-handlers",
    "announcement",
    "moderate",
  ]) {
    assert.equal(canAccessGovernanceSection("Secretary", section), true);
    assert.equal(canManageGovernanceSection("Secretary", section), false);
  }
  assert.equal(canAccessGovernanceSection("Secretary", "reports"), true);
  assert.equal(canGenerateGovernanceReport("Secretary"), true);
  assert.equal(canDownloadGovernanceSectionReport("Secretary"), false);
});

test("Treasurer manages Budget and Funds while Auditor is read-only across Governance", () => {
  for (const section of [
    "audit",
    "budget",
    "funds",
    "event-handlers",
    "announcement",
    "moderate",
  ]) {
    assert.equal(canAccessGovernanceSection("Auditor", section), true);
    assert.equal(canManageGovernanceSection("Auditor", section), false);
  }
  assert.equal(canAccessGovernanceSection("Auditor", "reports"), true);
  assert.equal(canManageGovernanceSection("Auditor", "reports"), false);
  assert.equal(canGenerateGovernanceReport("Auditor"), true);
  assert.equal(canDownloadGovernanceSectionReport("Auditor"), true);

  assert.equal(canManageGovernanceSection("Treasurer", "budget"), true);
  assert.equal(canManageGovernanceSection("Treasurer", "funds"), true);
  assert.equal(canAccessGovernanceSection("Treasurer", "audit"), false);
  assert.equal(canGenerateGovernanceReport("Treasurer"), false);
});

test("PIO and Protocol Officer are limited to their assigned sections", () => {
  assert.equal(canManageGovernanceSection("P.I.O.", "announcement"), true);
  assert.equal(canManageGovernanceSection("PIO", "event-handlers"), true);
  assert.equal(canAccessGovernanceSection("PIO", "funds"), false);

  assert.equal(canManageGovernanceSection("Protocol Officer", "moderate"), true);
  assert.equal(canAccessGovernanceSection("Protocol Officer", "budget"), false);
  assert.equal(canGenerateGovernanceReport("PIO"), false);
});
