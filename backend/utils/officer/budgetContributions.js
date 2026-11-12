export const calculateContributionPerMember = (amount, memberCount) => {
  const amountInCents = Math.round(Number(amount) * 100);
  const count = Number(memberCount);
  if (!Number.isSafeInteger(amountInCents) || amountInCents < 0) {
    throw new Error("Budget amount must be a non-negative currency amount.");
  }
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("At least one room member is required.");
  }
  return Math.floor(amountInCents / count) / 100;
};
