import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/student/budget-contributions`,
  timeout: 15000,
});

const request = async (callback, memberType) => {
  const tokenKey = memberType === "officer" ? "officer_token" : "student_token";
  const token = localStorage.getItem(tokenKey);
  if (!token) throw new Error("Your room-member session has expired. Please sign in again.");

  try {
    return (await callback({ headers: { Authorization: `Bearer ${token}` } })).data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
        error.response?.data?.message ||
        (error.request ? "Server not responding" : "Unable to complete the request"),
    );
  }
};

export const fetchRoomBudgetPlans = (roomId, memberType) =>
  request((config) => api.get("/plans", { ...config, params: { roomId } }), memberType);

export const fetchMyPlanSubmissions = (roomId, fundId, memberType) =>
  request(
    (config) => api.get(`/${fundId}/submissions`, { ...config, params: { roomId } }),
    memberType,
  );

export const submitBudgetContribution = (fundId, values, memberType) => {
  const formData = new FormData();
  formData.append("roomId", String(values.roomId));
  formData.append("amount", values.amount);
  formData.append("payment_method", values.payment_method);
  formData.append("remarks", values.remarks || "");
  formData.append("proof", values.proof);
  return request((config) => api.post(`/${fundId}/submissions`, formData, config), memberType);
};
