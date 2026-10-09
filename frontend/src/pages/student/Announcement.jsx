import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import SearchIcon from "@mui/icons-material/Search";
import AnnouncementCard from "../../components/officer/Announcement/AnnouncementCard";
import RoomTabs from "../../components/room/RoomTabs";
import {
  fetchAnnouncements,
  validateRoomCode,
} from "../../api/student/announcementAPI";
import { fetchMyRoom } from "../../api/roomAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const studentId = localStorage.getItem("student_student_id");
  const joinedRoomStorageKey = studentId
    ? `studentJoinedRoom:${studentId}`
    : null;

  // Room states
  const [joinedRoom, setJoinedRoom] = useState(() => {
    const currentStudentId = localStorage.getItem("student_student_id");
    const savedRoom = currentStudentId
      ? localStorage.getItem(`studentJoinedRoom:${currentStudentId}`)
      : null;
    localStorage.removeItem("studentJoinedRoom");
    return savedRoom ? JSON.parse(savedRoom) : null;
  });
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Snackbar notification
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Fetch announcements list
  const loadAnnouncements = async (roomId) => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnnouncements(roomId);
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Error loading announcements:", err);
      setError(err.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (joinedRoom) {
      loadAnnouncements(joinedRoom.room_id);
    }
  }, [joinedRoom]);

  useEffect(() => {
    let active = true;
    fetchMyRoom()
      .then((room) => {
        if (!active) return;
        if (!room) {
          setJoinedRoom(null);
          localStorage.removeItem(joinedRoomStorageKey);
          return;
        }
        setJoinedRoom(room);
        localStorage.setItem(joinedRoomStorageKey, JSON.stringify(room));
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load your room. Please try again.");
      });

    return () => {
      active = false;
    };
  }, []);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    setRoomLoading(true);
    setError(null);
    try {
      const room = await validateRoomCode(roomCodeInput.trim());
      setJoinedRoom(room);
      localStorage.setItem(joinedRoomStorageKey, JSON.stringify(room));
      showSnackbar(`Joined room: ${room.room_name}`, "success");
    } catch (err) {
      setError(err.message || "Invalid room code.");
    } finally {
      setRoomLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    setJoinedRoom(null);
    if (joinedRoomStorageKey) {
      localStorage.removeItem(joinedRoomStorageKey);
    }
    setAnnouncements([]);
    setRoomCodeInput("");
  };

  const filteredAnnouncements = announcements.filter((announcement) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      announcement.announcement_body?.toLowerCase().includes(term) ||
      announcement.link?.toLowerCase().includes(term)
    );
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Announcements</title>
      </Helmet>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
          >
            Announcements {joinedRoom && `- ${joinedRoom.room_name}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {joinedRoom
              ? `Viewing announcements for room ${joinedRoom.room_number}`
              : "Join a room to view announcements"}
          </Typography>
        </Box>

        {joinedRoom && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleLeaveRoom}
            sx={{ borderRadius: 2, fontWeight: "bold" }}
          >
            Leave Room
          </Button>
        )}
      </Box>

      {/* Main Content Area */}
      {!joinedRoom ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              mb: 3,
              width: "100%",
              maxWidth: 500,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <CampaignIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
              Join a Room
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3, textAlign: "center" }}
            >
              Enter a room code to view its announcements.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleJoinRoom}
              sx={{ width: "100%", display: "flex", gap: 2 }}
            >
              <TextField
                fullWidth
                placeholder="Enter Room Code (e.g. bly-ogts)"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                disabled={roomLoading}
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                disabled={!roomCodeInput.trim() || roomLoading}
                sx={{ px: 3, fontWeight: "bold", whiteSpace: "nowrap" }}
              >
                {roomLoading ? "Joining..." : "Join"}
              </Button>
            </Box>
          </Paper>
        </Box>
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <TextField
              fullWidth
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Paper>

          <Box sx={{ mb: 3 }}>
            <RoomTabs
              announcements={announcements}
              roomId={joinedRoom.room_id}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Announcements feed */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 10 }}>
              <CircularProgress />
            </Box>
          ) : filteredAnnouncements.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 3,
                border: "1px dashed",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <CampaignIcon
                sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchTerm
                  ? "No announcements found matching your search"
                  : "No announcements in this room"}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {searchTerm
                  ? "Try adjusting your search query."
                  : "When an officer posts an announcement, it will appear here."}
              </Typography>
            </Paper>
          ) : (
            /* Centered Feed of Announcements */
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              {filteredAnnouncements.map((announcement) => (
                <Box
                  key={announcement.announcement_id}
                  sx={{ width: "100%", maxWidth: 600 }}
                >
                  {/* No onEdit or onDelete passed, so buttons are hidden */}
                  <AnnouncementCard announcement={announcement} />
                </Box>
              ))}
            </Box>
          )}
        </>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
