import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authenticateBudgetContributor } from "../middleware/budgetContributionAuthMiddleware.js";
import { calculateContributionPerMember } from "../utils/officer/budgetContributions.js";
import { getRemainingContribution } from "../utils/officer/budgetContributionLimits.js";

test("suggested member shares stay in currency precision without exceeding the plan", () => {
  assert.equal(calculateContributionPerMember("100.00", 3), 33.33);
  assert.equal(calculateContributionPerMember("19.99", 3), 6.66);
  assert.equal(calculateContributionPerMember("120.00", 3), 40);
  assert.equal(calculateContributionPerMember("0.01", 3), 0);
});

test("member share calculation rejects invalid amounts and member counts", () => {
  assert.throws(() => calculateContributionPerMember("not-money", 3));
  assert.throws(() => calculateContributionPerMember("10.00", 0));
});

test("approved and pending partial payments both reduce the member's available share", () => {
  assert.equal(getRemainingContribution("500.00", "100.00", "125.50"), 274.5);
  assert.equal(getRemainingContribution("500.00", "500.00", "0.00"), 0);
  assert.equal(getRemainingContribution("500.00", "500.00", "10.00"), 0);
});

test("budget contribution auth accepts student and officer sessions for room membership checks", async () => {
  const secret = process.env.JWT_SECRET || "your_secret_key";
  const authenticate = (claims) =>
    new Promise((resolve, reject) => {
      const req = {
        headers: {
          authorization: `Bearer ${jwt.sign(claims, secret)}`,
        },
      };
      const res = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          reject(new Error(`${this.statusCode}: ${body.message}`));
        },
      };
      authenticateBudgetContributor(req, res, () => resolve(req.user));
    });

  assert.deepEqual(await authenticate({ student_id: 7 }), {
    member_id: 7,
    student_id: 7,
  });
  assert.deepEqual(await authenticate({ officer_id: 9 }), {
    member_id: 9,
    officer_id: 9,
  });
  assert.deepEqual(await authenticate({ student_id: 7, officer_id: 9 }), {
    member_id: 9,
    officer_id: 9,
  });
});
