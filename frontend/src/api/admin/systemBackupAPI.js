import axios from "axios";
import { API_BASE_URL } from "../apiBaseURL";
import { handleAdminAuthFailure } from "./adminAuthInterceptor";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/admin/backup`,
});

handleAdminAuthFailure(api);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const throwRequestError = async (error) => {
  const responseData = error.response?.data;
  if (responseData instanceof Blob) {
    let responseJson;
    try {
      responseJson = JSON.parse(await responseData.text());
    } catch {
      responseJson = null;
    }
    if (responseJson?.message) throw new Error(responseJson.message);
  }
  throw new Error(
    responseData?.message ||
      (error.request
        ? "Server not responding. Please check your connection and try again."
        : "System backup request failed."),
  );
};

export const exportSystemBackup = async (password) => {
  try {
    return await api.post(
      "/export",
      {},
      {
        responseType: "blob",
        headers: { "X-Admin-Password": password },
      },
    );
  } catch (error) {
    await throwRequestError(error);
  }
};

export const importSystemBackup = async (file, password) => {
  const formData = new FormData();
  formData.append("backup", file);

  try {
    const response = await api.post("/import", formData, {
      headers: { "X-Admin-Password": password },
    });
    return response.data;
  } catch (error) {
    await throwRequestError(error);
  }
};
