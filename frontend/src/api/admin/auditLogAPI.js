import axios from "axios";

// Create an Axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000,
});

// Interceptor to attach Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
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

// Fetch all audit logs
export const fetchAuditLogs = async (
  search = "",
  date = null,
  period = "all",
) => {
  try {
    const url = "/admin/audit";
    const res = await api.get(url, {
      params: {
        search,
        date: date ? (date.format ? date.format("YYYY-MM-DD") : date) : "",
        period,
      },
    });
    return res.data || [];
  } catch (error) {
    console.error("Error in fetchAuditLogs:", error);
    handleError(error);
  }
};

export const recordAdminLogout = async () => {
  const url = "/admin/audit";
  await api.post(url, { action: "Logout" });
};
