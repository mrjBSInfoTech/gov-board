import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/officer/calendar",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("officer_token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message ||
      (error.request ? "Server not responding" : "Unable to complete calendar request."),
  );
};

export const fetchCalendarEvents = async (roomId) => {
  try {
    const response = await api.get("/", { params: roomId ? { roomId } : undefined });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createCalendarEvent = async (event, roomId) => {
  try {
    const response = await api.post("/", { ...event, room_id: roomId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateCalendarEvent = async (eventId, event, roomId) => {
  try {
    const response = await api.put(`/${eventId}`, { ...event, room_id: roomId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteCalendarEvent = async (eventId) => {
  try {
    const response = await api.delete(`/${eventId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
