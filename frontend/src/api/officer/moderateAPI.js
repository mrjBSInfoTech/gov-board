import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/officer/moderate`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("officer_token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

const handleError = (error) => {
  const message =
    error.response?.data?.message || "Unable to update room moderation.";
  throw new Error(message);
};

const validateRoomId = (roomId) => {
  if (!Number.isSafeInteger(Number(roomId)) || Number(roomId) < 1) {
    throw new Error("A valid room is required.");
  }
};

const validateMemberAction = (roomId, memberId) => {
  validateRoomId(roomId);
  if (!Number.isSafeInteger(Number(memberId)) || Number(memberId) < 1) {
    throw new Error("A valid room member is required.");
  }
};

export const fetchRoomModerationMembers = async (roomId) => {
  validateRoomId(roomId);
  try {
    const response = await api.get("/members", { params: { roomId } });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const kickRoomMember = async (roomId, memberId) => {
  validateMemberAction(roomId, memberId);
  try {
    const response = await api.post(`/${memberId}/kick`, { roomId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const promoteRoomMember = async (
  roomId,
  memberId,
  position,
  confirmReplace = false,
) => {
  validateMemberAction(roomId, memberId);
  if (!position) throw new Error("An officer position is required.");
  try {
    const response = await api.post(`/${memberId}/promote`, {
      roomId,
      position,
      confirmReplace,
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      const nextError = new Error(
        error.response.data?.message || "Unable to promote room member.",
      );
      nextError.response = error.response;
      throw nextError;
    }
    handleError(error);
  }
};

export const demoteRoomMember = async (roomId, memberId) => {
  validateMemberAction(roomId, memberId);
  try {
    const response = await api.post(`/${memberId}/demote`, { roomId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const muteRoomMember = async (roomId, memberId, durationMinutes) => {
  validateMemberAction(roomId, memberId);
  if (![30, 60, 180, 720, 1440].includes(Number(durationMinutes))) {
    throw new Error("Choose a mute duration of up to 24 hours.");
  }
  try {
    const response = await api.post(`/${memberId}/mute`, {
      roomId,
      durationMinutes: Number(durationMinutes),
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const unmuteRoomMember = async (roomId, memberId) => {
  validateMemberAction(roomId, memberId);
  try {
    const response = await api.post(`/${memberId}/unmute`, { roomId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};