import axios from "axios";
import { API_BASE_URL } from "./apiBaseURL";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/rooms`,
});

api.interceptors.request.use((config) => {
  const routeSection = window.location.pathname.split("/")[1];
  const authSection = localStorage.getItem("auth_section");
  const isPanelRoute = ["admin", "officer", "student"].includes(routeSection);
  const token = isPanelRoute
    ? localStorage.getItem(`${routeSection}_token`)
    : (authSection && localStorage.getItem(`${authSection}_token`)) ||
      localStorage.getItem("officer_token") ||
      localStorage.getItem("student_token") ||
      localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleError = (error) => {
  if (error.response) {
    throw new Error(
      error.response.data.error ||
        error.response.data.message ||
        "Server error",
    );
  }
  if (error.request) throw new Error("Server not responding");
  throw new Error("Unexpected error occurred");
};

export const fetchRoomMessages = async (roomId) => {
  try {
    const response = await api.get(`/${roomId}/messages`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const toggleRoomMessageReaction = async (roomId, messageId, emoji) => {
  try {
    const response = await api.post(
      `/${roomId}/messages/${messageId}/reactions`,
      { emoji },
    );
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteRoomMessage = async (roomId, messageId) => {
  try {
    const response = await api.delete(`/${roomId}/messages/${messageId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchRoomMembers = async (roomId) => {
  try {
    const response = await api.get(`/${roomId}/members`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const requestRoomJoin = async (roomNumber) => {
  const normalizedRoomNumber =
    typeof roomNumber === "string" ? roomNumber.trim() : "";
  if (!normalizedRoomNumber) throw new Error("A room code is required.");

  try {
    const response = await api.post("/join-requests", {
      roomNumber: normalizedRoomNumber,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchRoomJoinRequests = async (roomId) => {
  if (!Number.isSafeInteger(Number(roomId)) || Number(roomId) < 1) {
    throw new Error("A valid room is required to load join requests.");
  }

  try {
    const response = await api.get(`/${roomId}/join-requests`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const decideRoomJoinRequest = async (roomId, requestId, decision) => {
  if (
    !Number.isSafeInteger(Number(roomId)) ||
    Number(roomId) < 1 ||
    !Number.isSafeInteger(Number(requestId)) ||
    Number(requestId) < 1 ||
    !["approve", "reject"].includes(decision)
  ) {
    throw new Error("A valid room, request, and decision are required.");
  }

  try {
    const response = await api.patch(
      `/${roomId}/join-requests/${requestId}`,
      { decision },
    );
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchMyRoom = async (requestedRoomId) => {
  try {
    let roomId = requestedRoomId;
    if (roomId === undefined) {
      const studentId = localStorage.getItem("student_student_id");
      const studentRoom = studentId
        ? localStorage.getItem(`studentJoinedRoom:${studentId}`)
        : null;
      const officerRoom = localStorage.getItem("joinedRoom");
      const authSection = localStorage.getItem("auth_section");
      const savedRoom =
        authSection === "officer" ||
        (!authSection && localStorage.getItem("officer_token") && !studentRoom)
          ? officerRoom
          : studentRoom || officerRoom;
      roomId = savedRoom ? JSON.parse(savedRoom)?.room_id : null;
    } else if (!Number.isSafeInteger(Number(roomId)) || Number(roomId) < 1) {
      throw new Error("A valid room is required.");
    }

    const response = await api.get("/my-room", {
      params: roomId ? { roomId } : undefined,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchMyRooms = async () => {
  try {
    const response = await api.get("/my-rooms");
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchRoomQuests = async (roomId) => {
  if (!Number.isSafeInteger(Number(roomId)) || Number(roomId) < 1) {
    throw new Error("A valid room is required to load quests.");
  }

  try {
    const response = await api.get(`/${roomId}/quests`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchRoomLevel = async (roomId) => {
  if (!Number.isSafeInteger(Number(roomId)) || Number(roomId) < 1) {
    throw new Error("A valid room is required to load room EXP.");
  }

  try {
    const response = await api.get(`/${roomId}/level`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const sendRoomMessage = async (roomId, message, media) => {
  try {
    const formData = new FormData();
    formData.append("message", message);
    if (media) formData.append("media", media);

    const response = await api.post(`/${roomId}/messages`, formData);
    window.dispatchEvent(
      new CustomEvent("room-xp-updated", { detail: { roomId } }),
    );
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
