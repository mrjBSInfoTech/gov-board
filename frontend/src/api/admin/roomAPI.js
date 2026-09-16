import axios from "axios";

// Axios instance (centralized config)
const api = axios.create({
  baseURL: "http://localhost:5000/api/admin",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized error handler
const handleError = (error) => {
  if (error.response) {
    const errorObj = new Error(error.response.data.message || "Server error");
    errorObj.response = error.response;
    throw errorObj;
  } else if (error.request) {
    throw new Error("Server not responding");
  } else {
    throw new Error("Unexpected error occurred");
  }
};

// ─── Room API Functions ───────────────────────────────────────────────────────

// GET all rooms
export const fetchRooms = async () => {
  try {
    const res = await api.get("/rooms");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// GET one room
export const fetchRoom = async (id) => {
  try {
    const res = await api.get(`/rooms/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// POST create new room
export const addRoom = async (formData) => {
  try {
    const res = await api.post("/rooms", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// PUT update room
export const updateRoom = async (id, formData) => {
  try {
    const res = await api.put(`/rooms/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// DELETE room
export const deleteRoom = async (id) => {
  try {
    const res = await api.delete(`/rooms/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};