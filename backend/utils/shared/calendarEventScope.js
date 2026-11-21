export const getAdminEventScope = (admin) =>
  admin.is_super_admin
    ? { visibilityScope: "global", college: null }
    : { visibilityScope: "college", college: admin.college };

export const getRoomCalendarEventPredicate = (eventAlias = "e", roomAlias = "r") =>
  `(
    ${eventAlias}.visibility_scope = 'global'
    OR (
      ${eventAlias}.visibility_scope = 'college'
      AND (
        ${roomAlias}.all_colleges = 1
        OR EXISTS (
          SELECT 1
            FROM room_college rc
           WHERE rc.room_id = ${roomAlias}.room_id
             AND LOWER(rc.college) = LOWER(${eventAlias}.college)
        )
      )
    )
    OR (${eventAlias}.visibility_scope = 'room' AND ${eventAlias}.room_id = ${roomAlias}.room_id)
  )`;

export const getRoomCollegeAudiencePredicate = (collegeExpression, roomAlias = "r") =>
  `(
    ${roomAlias}.all_colleges = 1
    OR EXISTS (
      SELECT 1
        FROM room_college rc
       WHERE rc.room_id = ${roomAlias}.room_id
         AND LOWER(rc.college) = LOWER(${collegeExpression})
    )
  )`;

export const getRoomCollegeMemberVisibilityPredicate = (
  collegeExpression,
  roomAlias = "r",
  studentAlias = "s",
) =>
  `(
    ${getRoomCollegeAudiencePredicate(collegeExpression, roomAlias)}
    AND LOWER(${studentAlias}.college) = LOWER(${collegeExpression})
  )`;

export const getRoomGovernanceAnnouncementPredicate = ({
  announcementAlias = "ga",
  roomAlias = "r",
  studentAlias = null,
  extraCollegeSql = "",
} = {}) => {
  const collegeVisibility = studentAlias
    ? getRoomCollegeMemberVisibilityPredicate(
        `${announcementAlias}.college`,
        roomAlias,
        studentAlias,
      )
    : getRoomCollegeAudiencePredicate(`${announcementAlias}.college`, roomAlias);

  return `(
    (${announcementAlias}.visibility_scope = 'global' AND ${roomAlias}.all_colleges = 1)
    OR (
      ${announcementAlias}.visibility_scope = 'college'
      AND ${collegeVisibility}${extraCollegeSql}
    )
  )`;
};

const normalizeCollege = (value) =>
  typeof value === "string" ? value.trim().toLocaleLowerCase() : "";

export const isCollegeIncludedInRoomAudience = (college, room) =>
  Boolean(
    room.all_colleges ||
      (room.colleges || []).some(
        (roomCollege) => normalizeCollege(college) === normalizeCollege(roomCollege),
      ),
  );

export const isCollegeContentVisibleToRoomMember = (college, room, memberCollege) =>
  Boolean(
    normalizeCollege(college) &&
      isCollegeIncludedInRoomAudience(college, room) &&
      normalizeCollege(college) === normalizeCollege(memberCollege),
  );

export const isCalendarEventVisibleToRoom = (event, room) => {
  if (event.visibility_scope === "global") return true;
  if (
    event.visibility_scope === "college" &&
    normalizeCollege(event.college) &&
    isCollegeIncludedInRoomAudience(event.college, room)
  ) {
    return true;
  }
  return (
    event.visibility_scope === "room" &&
    Number(event.room_id) === Number(room.room_id)
  );
};
