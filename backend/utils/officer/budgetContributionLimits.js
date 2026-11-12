export const getRemainingContribution = (perMemberAmount, approvedAmount, pendingAmount) =>
  Math.max(
    0,
    Math.round(Number(perMemberAmount) * 100) -
      Math.round(Number(approvedAmount) * 100) -
      Math.round(Number(pendingAmount) * 100),
  ) / 100;
