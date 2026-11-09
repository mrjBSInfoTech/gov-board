import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/admin/calendar`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message ||
      (error.request ? "Server not responding" : "Unable to complete calendar request."),
  );
};

export const fetchAdminCalendarEvents = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchAdminRoomCalendarEvents = async (roomId) => {
  try {
    const response = await api.get(`/room/${roomId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createAdminCalendarEvent = async (event) => {
  try {
    const response = await api.post("/", event);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateAdminCalendarEvent = async (eventId, event) => {
  try {
    const response = await api.put(`/${eventId}`, event);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteAdminCalendarEvent = async (eventId) => {
  try {
    const response = await api.delete(`/${eventId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
