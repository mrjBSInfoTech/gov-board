import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";

const api = axios.create({ baseURL: `${API_BASE_URL}/api/officer/budget`, timeout: 5000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("officer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const request = async (callback) => {
  try {
    return (await callback()).data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.response?.data?.message || (error.request ? "Server not responding" : "Unable to complete the request"));
  }
};

export const fetchBudgets = (roomId) => request(() => api.get("/", { params: { roomId } }));
export const addBudget = (budget) => request(() => api.post("/", budget));
export const updateBudget = (id, budget) => request(() => api.put(`/${id}`, budget));
export const deleteBudget = (id) => request(() => api.delete(`/${id}`));
