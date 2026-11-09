export const getAuditRoomId = (req) => {
  const roomPathMatch = req.originalUrl?.match(/^\/api\/rooms\/(\d+)(?:\/|$)/);
  const candidate =
    req.auditRoomId ??
    req.roomId ??
    req.params?.roomId ??
    req.query?.roomId ??
    req.body?.roomId ??
    req.body?.room_id ??
    roomPathMatch?.[1];
  const roomId = Number(candidate);
  return Number.isSafeInteger(roomId) && roomId > 0 ? roomId : null;
};
