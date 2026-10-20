import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/officer/fund`,
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("officer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const request = async (callback) => {
  try {
    const response = await callback();
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      (error.request ? "Server not responding" : "Unable to complete the request");
    throw new Error(message);
  }
};

export const fetchFunds = (roomId) =>
  request(() => api.get("/", { params: roomId ? { roomId } : {} }));

export const addFund = (fundData) => request(() => api.post("/", fundData));

export const updateFund = (fundId, fundData) =>
  request(() => api.put(`/${fundId}`, fundData));

export const deleteFund = (fundId) => request(() => api.delete(`/${fundId}`));

export const fetchFundContributions = (fundId) =>
  request(() => api.get(`/${fundId}/contributions`));

export const addFundContribution = (fundId, contributionData) =>
  request(() => api.post(`/${fundId}/contributions`, contributionData));
