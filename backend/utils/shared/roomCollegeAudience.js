export const normalizeRoomCollegeTargets = (colleges) => {
  if (
    !Array.isArray(colleges) ||
    colleges.some(
      (college) =>
        typeof college !== "string" ||
        !college.trim() ||
        college.trim().length > 150,
    )
  ) {
    return null;
  }

  const targets = new Map();
  for (const college of colleges) {
    const trimmedCollege = college.trim();
    const key = trimmedCollege.toLocaleLowerCase();
    if (!targets.has(key)) targets.set(key, trimmedCollege);
  }
  return [...targets.values()];
};
