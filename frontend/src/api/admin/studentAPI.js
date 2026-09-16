import axios from "axios";

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

export const fetchStudents = async () => {
  try {
    const response = await api.get("/students");
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || "Server error");
    }
    if (error.request) {
      throw new Error("Server not responding");
    }
    throw new Error("Unexpected error occurred");
  }
};
