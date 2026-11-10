export const OFFICER_POSITIONS = [
  "Mayor",
  "Vice-Mayor",
  "Secretary",
  "Treasurer",
  "Auditor",
  "P.I.O.",
  "Protocol Officer",
];

export const MUTE_DURATIONS = [30, 60, 180, 720, 1440];

export const normalizeOfficerPosition = (position) =>
  String(position || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const positionRank = (position) =>
  OFFICER_POSITIONS.findIndex(
    (item) => normalizeOfficerPosition(item) === normalizeOfficerPosition(position),
  );

export const canAccessRoomModeration = (position) =>
  ["mayor", "vice-mayor", "protocol-officer"].includes(
    normalizeOfficerPosition(position),
  );

export const canModerateTarget = (
  actorPosition,
  action,
  target,
  actorId,
  targetId,
) => {
  const actor = normalizeOfficerPosition(actorPosition);
  const targetPosition = normalizeOfficerPosition(target.position);
  const actorRank = positionRank(actorPosition);
  const targetRank =
    target.memberType === "student"
      ? OFFICER_POSITIONS.length
      : positionRank(target.position);
  const isDifferentMember = Number(actorId) !== Number(targetId);

  if (!isDifferentMember || actorRank < 0) return false;
  if (action === "kick") {
    if (actor === "protocol-officer") return targetPosition !== "mayor";
    return ["mayor", "vice-mayor"].includes(actor) && targetRank > actorRank;
  }
  if (action === "mute" || action === "unmute") {
    return (
      actor === "protocol-officer" &&
      targetPosition !== "mayor" &&
      targetPosition !== "vice-mayor"
    );
  }
  if (action === "demote") {
    return (
      ["mayor", "vice-mayor"].includes(actor) &&
      target.memberType === "officer" &&
      targetRank > actorRank
    );
  }
  if (action === "promote") {
    return (
      ["mayor", "vice-mayor"].includes(actor) &&
      ["student", "officer"].includes(target.memberType) &&
      targetRank > actorRank
    );
  }
  return false;
};

export const canPromoteToPosition = (actorPosition, target, newPosition) => {
  const actor = normalizeOfficerPosition(actorPosition);
  const actorRank = positionRank(actorPosition);
  const targetRank =
    target.memberType === "student"
      ? OFFICER_POSITIONS.length
      : positionRank(target.position);
  const newRank = positionRank(newPosition);

  return (
    ["mayor", "vice-mayor"].includes(actor) &&
    actorRank >= 0 &&
    newRank > actorRank &&
    newRank < targetRank
  );
};
