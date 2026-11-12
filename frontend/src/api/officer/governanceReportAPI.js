import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/officer/governance/reports`,
  timeout: 30000,
});

export const fetchGovernanceReport = async (roomId, section = "all") => {
  const token = localStorage.getItem("officer_token");
  if (!token) throw new Error("Your officer session has expired. Please sign in again.");

  try {
    const response = await api.get("/", {
      params: { roomId, section },
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      const body = await error.response.data.text();
      try {
        const parsed = JSON.parse(body);
        throw new Error(parsed.message || "Unable to generate the governance report.");
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error("Unable to generate the governance report.");
        }
        throw parseError;
      }
    }
    throw new Error(
      error.response?.data?.message ||
        (error.request ? "Server not responding" : "Unable to generate the governance report."),
    );
  }
};
