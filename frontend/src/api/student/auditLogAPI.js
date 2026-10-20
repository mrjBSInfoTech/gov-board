import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";

// Create an Axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 5000,
});

// Interceptor to attach Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("student_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper function to handle errors globally
const handleError = (error) => {
  if (error.response) {
    console.error("Server error:", error.response.status, error.response.data);
    throw new Error(
      error.response.data.error || error.response.data.message || "Server responded with an error"
    );
  } else if (error.request) {
    console.error("No response from server:", error.message);
    throw new Error("Server not responding. Please check your connection or try again later.");
  } else {
    console.error("Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

export const recordStudentLogout = async () => {
  const url = "/student/audit";
  await api.post(url, { action: "Logout" });
};