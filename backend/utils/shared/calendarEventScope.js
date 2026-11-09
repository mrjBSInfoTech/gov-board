export const getAdminEventScope = (admin) =>
  admin.is_super_admin
    ? { visibilityScope: "global", college: null }
    : { visibilityScope: "college", college: admin.college };

export const getRoomCalendarEventPredicate = (eventAlias = "e", roomAlias = "r") =>
  `(
    ${eventAlias}.visibility_scope = 'global'
    OR (${eventAlias}.visibility_scope = 'college' AND ${eventAlias}.college = ${roomAlias}.college)
    OR (${eventAlias}.visibility_scope = 'room' AND ${eventAlias}.room_id = ${roomAlias}.room_id)
  )`;

const normalizeCollege = (value) =>
  typeof value === "string" ? value.trim().toLocaleLowerCase() : "";

export const isCalendarEventVisibleToRoom = (event, room) => {
  if (event.visibility_scope === "global") return true;
  if (
    event.visibility_scope === "college" &&
    normalizeCollege(event.college) &&
    normalizeCollege(event.college) === normalizeCollege(room.college)
  ) {
    return true;
  }
  return (
    event.visibility_scope === "room" &&
    Number(event.room_id) === Number(room.room_id)
  );
};
