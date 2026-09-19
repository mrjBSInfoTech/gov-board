import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/rooms",
});

api.interceptors.request.use((config) => {
  const token =
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

export const sendRoomMessage = async (roomId, message, senderName) => {
  try {
    const response = await api.post(`/${roomId}/messages`, {
      message,
      sender_name: senderName,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
