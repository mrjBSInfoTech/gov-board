export const getRoomSenderName = async (connection, senderType, senderId) => {
  const query =
    senderType === "admin"
      ? "SELECT first_name, last_name FROM admin WHERE admin_id = ? LIMIT 1"
      : ["officer", "student"].includes(senderType)
        ? "SELECT first_name, last_name FROM student WHERE student_id = ? LIMIT 1"
        : null;

  if (!query) {
    throw new Error("Unable to identify room sender.");
  }

  const [rows] = await connection.query(query, [senderId]);
  if (!rows.length) return null;

  const name = [rows[0].first_name, rows[0].last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
};
