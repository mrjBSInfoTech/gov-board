export const canReviewRoomJoinRequests = (membership, roomId) =>
  Number(membership?.roomId) === Number(roomId) &&
  ["admin", "officer"].includes(membership?.memberType);
