import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/student/calendar",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("student_token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

export const fetchStudentCalendarEvents = async (roomId) => {
  try {
    const response = await api.get("/", { params: { roomId } });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        (error.request ? "Server not responding" : "Unable to load calendar events."),
    );
  }
};
