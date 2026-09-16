import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/student/authenticate",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

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

// REGISTER
export const registerUser = async ({
  first_name,
  last_name,
  student_number,
  position,
  year,
  section,
  password,
}) => {
  try {
    const res = await api.post("/register", {
      first_name,
      last_name,
      student_number,
      position,
      year,
      section,
      password,
    });
    console.log("Register API response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Register API error:", error.message);
    handleError(error);
  }
};

// LOGIN
export const loginUser = async ({ student_number, password }) => {
  try {
    const res = await api.post("/login", { student_number, password });
    console.log("Login API response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Login API error:", error.message);
    handleError(error);
  }
};

// LOGOUT
export const logoutUser = () => {
  localStorage.removeItem("student_token");
  localStorage.removeItem("student_student_id");
  localStorage.removeItem("student_student_number");
  localStorage.removeItem("student_first_name");
  localStorage.removeItem("student_last_name");
};

// CHECK AUTH
export const isAuthenticated = () => !!localStorage.getItem("student_token");

// GET TOKEN
export const getToken = () => localStorage.getItem("student_token");
