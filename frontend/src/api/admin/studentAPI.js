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

// POST create new officer account
export const addStudent = async (formData) => {
  try {
    const res = await api.post("/students", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// PUT update officer account
export const updateStudent = async (id, formData) => {
  try {
    const res = await api.put(`/students/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// DELETE officer account
export const deleteStudent = async (id) => {
  try {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

