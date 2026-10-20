export async function isRoomMember(database, roomId, memberId, memberType) {
  const [rows] = await database.promise().query(
    `SELECT room_id FROM room_member
      WHERE room_id = ? AND member_id = ? AND member_type = ? LIMIT 1`,
    [roomId, memberId, memberType],
  );

  return rows.length > 0;
}
