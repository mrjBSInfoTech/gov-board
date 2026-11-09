export const findRoomByCode = async (connection, roomCode) => {
  const [rooms] = await connection.query(
    `SELECT room_id, room_number, room_name, description, college
       FROM room
      WHERE room_number = ?
      LIMIT 1 FOR UPDATE`,
    [roomCode.trim()],
  );
  return rooms[0] || null;
};
