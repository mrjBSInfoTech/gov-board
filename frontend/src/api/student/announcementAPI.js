import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/student/announcements`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("student_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleError = (error) => {
  if (error.response) {
    throw new Error(error.response.data.error || "Server error");
  } else if (error.request) {
    throw new Error("Server not responding");
  } else {
    throw new Error("Unexpected error occurred");
  }
};

export const fetchAnnouncements = async (roomId = null) => {
  try {
    const params = roomId ? { roomId } : {};
    const res = await api.get("/", { params });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const validateRoomCode = async (roomNumber) => {
  try {
    const res = await api.get(`/room/validate/${roomNumber}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const leaveRoom = async () => {
  try {
    const res = await api.delete("/room");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
