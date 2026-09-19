import axios from "axios";

// Create an Axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000,
});

// Interceptor to attach Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("officer_token");
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

// Fetch all announcements
export const fetchAnnouncements = async (roomId = null) => {
  try {
    const url = roomId ? `/officer/announcements?roomId=${roomId}` : "/officer/announcements";
    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error in fetchAnnouncements:", error);
    handleError(error);
  }
};

// Validate room code
export const validateRoomCode = async (roomCode) => {
  try {
    const res = await api.get(`/officer/announcements/room/validate/${roomCode}`);
    return res.data;
  } catch (error) {
    console.error("Error in validateRoomCode:", error);
    handleError(error);
  }
};

// Fetch single announcement by ID
export const fetchAnnouncementById = async (id) => {
  try {
    const res = await api.get(`/officer/announcements/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error in fetchAnnouncementById:", error);
    handleError(error);
  }
};

// Add new announcement
export const addAnnouncement = async (announcementData) => {
  try {
    if (!announcementData.announcement_body || !announcementData.announcement_body.trim()) {
      throw new Error("Announcement content is required");
    }

    const formData = new FormData();
    formData.append("announcement_body", announcementData.announcement_body.trim());
    if (announcementData.link) formData.append("link", announcementData.link.trim());
    if (announcementData.room_id) formData.append("room_id", announcementData.room_id);
    if (announcementData.file instanceof File) {
      formData.append("file", announcementData.file);
    }

    const res = await api.post("/officer/announcements", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Update announcement
export const updateAnnouncement = async (id, announcementData) => {
  try {
    if (!announcementData.announcement_body || !announcementData.announcement_body.trim()) {
      throw new Error("Announcement content is required");
    }

    const formData = new FormData();
    formData.append("announcement_body", announcementData.announcement_body.trim());
    formData.append("link", announcementData.link ? announcementData.link.trim() : "");
    if (announcementData.room_id) formData.append("room_id", announcementData.room_id);
    if (announcementData.file instanceof File) {
      formData.append("file", announcementData.file);
    }

    const res = await api.put(`/officer/announcements/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete announcement
export const deleteAnnouncement = async (id) => {
  try {
    const res = await api.delete(`/officer/announcements/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
