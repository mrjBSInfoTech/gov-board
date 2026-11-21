import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";
import { handleAdminAuthFailure } from "./adminAuthInterceptor";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/admin/governance-announcements`,
});

handleAdminAuthFailure(api);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message ||
      (error.request ? "Server not responding" : "Unable to complete announcement request."),
  );
};

export const fetchGovernanceAnnouncements = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createGovernanceAnnouncement = async (announcement) => {
  try {
    const formData = new FormData();
    formData.append("title", announcement.title || "");
    formData.append("announcement_body", announcement.announcement_body);
    formData.append("link", announcement.link || "");
    (announcement.files || []).forEach((file) => formData.append("files", file));
    const response = await api.post("/", formData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateGovernanceAnnouncement = async (announcementId, announcement) => {
  try {
    const formData = new FormData();
    formData.append("title", announcement.title || "");
    formData.append("announcement_body", announcement.announcement_body);
    formData.append("link", announcement.link || "");
    if (announcement.send_update_email) {
      formData.append("send_update_email", "true");
    }
    (announcement.files || []).forEach((file) => formData.append("files", file));
    const response = await api.put(`/${announcementId}`, formData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteGovernanceAnnouncement = async (announcementId) => {
  try {
    const response = await api.delete(`/${announcementId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
