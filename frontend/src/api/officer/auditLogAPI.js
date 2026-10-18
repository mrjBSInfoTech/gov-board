import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:5000/api/officer/audit", timeout: 5000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("officer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchAuditLogs = async (search = "", date = null, period = "all") => {
  try {
    const response = await api.get("/", { params: {
      search, date: date ? (date.format ? date.format("YYYY-MM-DD") : date) : "", period,
    } });
    return response.data || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || "Unable to load audit logs. Please try again.");
  }
};


export const recordOfficerLogout = async () => {
  const url = "/officer/audit";
  await api.post(url, { action: "Logout" });
};