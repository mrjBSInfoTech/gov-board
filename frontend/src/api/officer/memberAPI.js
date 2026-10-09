import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:5000/api/officer/members" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("officer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  const message = error.response?.data?.message || "Unable to update member.";
  const nextError = new Error(message);
  nextError.response = error.response;
  throw nextError;
};

export const promoteOfficerMember = async (id, roomId, position, confirmReplace = false) => {
  try {
    const response = await api.post(`/${id}/promote`, { roomId, position, confirmReplace });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const demoteOfficerMember = async (id, roomId) => {
  try {
    const response = await api.post(`/${id}/demote`, { roomId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
