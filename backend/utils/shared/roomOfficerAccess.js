export async function clearOrphanedOfficerStatus(connection, officerIds) {
  const memberIds = [
    ...new Set(
      officerIds
        .map(Number)
        .filter((memberId) => Number.isSafeInteger(memberId) && memberId > 0),
    ),
  ];
  if (!memberIds.length) return;

  await connection.query(
    `UPDATE student s
        SET position = 'Student', role = NULL,
            can_add = 0, can_edit = 0,
            can_delete = 0, can_moderate = 0
      WHERE s.student_id IN (?)
        AND NOT EXISTS (
          SELECT 1 FROM room_member rm
           WHERE rm.member_id = s.student_id
             AND rm.member_type = 'officer'
        )`,
    [memberIds],
  );
}
