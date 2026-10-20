export function getQuestDateKey(
  date = new Date(),
  timeZone = process.env.QUEST_TIME_ZONE || "Asia/Manila",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const questDate = new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)),
  );

  if (Number(values.hour) < 4) {
    questDate.setUTCDate(questDate.getUTCDate() - 1);
  }

  return questDate.toISOString().slice(0, 10);
}

export function getRoomLevelProgress(totalExp) {
  const normalizedTotalExp = Math.max(0, Number(totalExp) || 0);
  let remainingExp = normalizedTotalExp;
  let level = 1;
  let requiredExp = 100;
  let previousCost = 100;
  let currentCost = 100;

  while (remainingExp >= requiredExp) {
    remainingExp -= requiredExp;
    level += 1;
    previousCost = currentCost;
    currentCost = requiredExp;
    requiredExp = level === 2 ? 100 : previousCost + currentCost;
  }

  return {
    level,
    current_level_exp: remainingExp,
    next_level_exp: requiredExp,
    next_level_total_exp:
      normalizedTotalExp + requiredExp - remainingExp,
  };
}
