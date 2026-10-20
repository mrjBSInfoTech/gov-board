import axios from "axios";
import { API_BASE_URL } from "./apiBaseURL";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/rooms`,
});

api.interceptors.request.use((config) => {
  const authSection = localStorage.getItem("auth_section");
  const token =
    (authSection && localStorage.getItem(`${authSection}_token`)) ||
    localStorage.getItem("officer_token") ||
    localStorage.getItem("student_token") ||
    localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleError = (error) => {
  if (error.response) {
    throw new Error(
      error.response.data.error ||
        error.response.data.message ||
        "Server error",
    );
  }
  if (error.request) throw new Error("Server not responding");
  throw new Error("Unexpected error occurred");
};

export const fetchRoomMessages = async (roomId) => {
  try {
    const response = await api.get(`/${roomId}/messages`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchRoomMembers = async (roomId) => {
  try {
    const response = await api.get(`/${roomId}/members`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchMyRoom = async () => {
  try {
    const response = await api.get("/my-room");
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchRoomQuests = async (roomId) => {
  if (!Number.isSafeInteger(Number(roomId)) || Number(roomId) < 1) {
    throw new Error("A valid room is required to load quests.");
  }

  try {
    const response = await api.get(`/${roomId}/quests`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchRoomLevel = async (roomId) => {
  if (!Number.isSafeInteger(Number(roomId)) || Number(roomId) < 1) {
    throw new Error("A valid room is required to load room EXP.");
  }

  try {
    const response = await api.get(`/${roomId}/level`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const sendRoomMessage = async (roomId, message, senderName, media) => {
  try {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("sender_name", senderName);
    if (media) formData.append("media", media);

    const response = await api.post(`/${roomId}/messages`, formData);
    window.dispatchEvent(
      new CustomEvent("room-xp-updated", { detail: { roomId } }),
    );
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
