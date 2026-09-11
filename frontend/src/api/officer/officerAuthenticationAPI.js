import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/officer/authenticate",
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
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

// LOGIN — officer logs in with student_number + password
export const loginUser = async ({ student_number, password }) => {
  try {
    const res = await api.post("/login", { student_number, password });
    console.log("Officer login response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Officer login error:", error.message);
    handleError(error);
  }
};

// LOGOUT — clear officer localStorage
export const logout = () => {
  localStorage.removeItem("officer_token");
  localStorage.removeItem("officer_officer_id");
  localStorage.removeItem("officer_student_number");
  localStorage.removeItem("officer_first_name");
  localStorage.removeItem("officer_last_name");
};

// CHECK AUTH
export const isAuthenticated = () => !!localStorage.getItem("officer_token");

// GET TOKEN
export const getToken = () => localStorage.getItem("officer_token");
