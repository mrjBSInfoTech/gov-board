import axios from "axios";

const createApi = (baseURL, tokenKey) => {
  const api = axios.create({ baseURL });
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return api;
};

const handleError = (error) => {
  throw new Error(error.response?.data?.message || "Unable to update account.");
};

export const createAccountApi = (role) => {
  const api = role === "officer"
    ? createApi("http://localhost:5000/api/officer/authenticate", "officer_token")
    : createApi("http://localhost:5000/api/student/authenticate", "student_token");

  return {
    getAccount: async () => {
      try {
        return (await api.get("/account")).data;
      } catch (error) {
        handleError(error);
      }
    },
    updateAccount: async (data) => {
      try {
        return (await api.put("/account", data)).data;
      } catch (error) {
        handleError(error);
      }
    },
    changePassword: async (data) => {
      try {
        return (await api.put("/account/password", data)).data;
      } catch (error) {
        handleError(error);
      }
    },
  };
};
