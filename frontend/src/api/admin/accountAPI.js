import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";
import { handleAdminAuthFailure } from "./adminAuthInterceptor";

// Axios instance (centralized config)
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/admin`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000,
});

handleAdminAuthFailure(api);

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

// ─── Account API Functions ───────────────────────────────────────────────────

// GET all officer accounts
export const fetchAccounts = async () => {
  try {
    const res = await api.get("/accounts");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchAdminAccounts = async () => {
  try {
    const res = await api.get("/accounts/admins");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const addAdminAccount = async (formData) => {
  try {
    const res = await api.post("/accounts/admins", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateAdminAccount = async (id, formData) => {
  try {
    const res = await api.put(`/accounts/admins/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateGovernorStudentEditPermission = async (id, enabled) => {
  try {
    const res = await api.patch(`/accounts/admins/${id}/student-edit-permission`, {
      can_edit_students: enabled,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteAdminAccount = async (id) => {
  try {
    const res = await api.delete(`/accounts/admins/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const demoteAccount = async (id, roomId = null) => {
  try {
    const res = await api.post(
      `/accounts/${id}/demote`,
      roomId ? { roomId } : {},
    );
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
// POST create new officer account
export const addAccount = async (formData) => {
  try {
    const res = await api.post("/accounts", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// PUT update officer account
export const updateAccount = async (id, formData) => {
  try {
    const res = await api.put(`/accounts/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// DELETE officer account
export const deleteAccount = async (id) => {
  try {
    const res = await api.delete(`/accounts/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
