export function getRoomAudienceLabel(room) {
  if (room?.all_colleges) return "All colleges";

  const colleges = Array.isArray(room?.colleges)
    ? room.colleges.filter((college) => typeof college === "string" && college.trim())
    : [];
  if (colleges.length) return colleges.join(", ");

  return room?.college || "Unassigned college";
}
