import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import LogoutIcon from "@mui/icons-material/Logout";
import AnnouncementCard from "../../components/officer/Announcement/AnnouncementCard";
import RoomTabs from "../../components/room/RoomTabs";
import {
  fetchAnnouncements,
  validateRoomCode,
} from "../../api/student/announcementAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Room states
  const [joinedRoom, setJoinedRoom] = useState(() => {
    const savedRoom = localStorage.getItem("studentJoinedRoom");
    return savedRoom ? JSON.parse(savedRoom) : null;
  });
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);

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

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    setRoomLoading(true);
    setError(null);
    try {
      const room = await validateRoomCode(roomCodeInput.trim());
      setJoinedRoom(room);
      localStorage.setItem("studentJoinedRoom", JSON.stringify(room));
      showSnackbar(`Joined room: ${room.room_name}`, "success");
    } catch (err) {
      setError(err.message || "Invalid room code.");
    } finally {
      setRoomLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    setJoinedRoom(null);
    localStorage.removeItem("studentJoinedRoom");
    setAnnouncements([]);
    setRoomCodeInput("");
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Announcements</title>
      </Helmet>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          mb: 4,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          {joinedRoom
            ? `${joinedRoom.room_name} Announcements`
            : "Announcements"}
        </Typography>

        {joinedRoom && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLeaveRoom}
          >
            Leave Room
          </Button>
        )}
      </Box>

      {/* Main Content Area */}
      {!joinedRoom ? (
        // JOIN ROOM UI
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 5,
              width: "100%",
              maxWidth: 480,
              textAlign: "center",
              borderRadius: 4,
              border: "1px solid",
              borderColor: "grey.200",
              boxShadow: "0 12px 24px -12px rgba(0,0,0,0.08)",
            }}
          >
            <MeetingRoomIcon
              sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
            />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Join a Room
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Enter the room code provided by your officer to view
              announcements.
            </Typography>

            <form onSubmit={handleJoinRoom}>
              <TextField
                fullWidth
                variant="outlined"
                label="Room Code"
                placeholder="e.g. abc-1x2y"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                sx={{ mb: 3 }}
                error={!!error}
                helperText={error}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={!roomCodeInput.trim() || roomLoading}
                sx={{ py: 1.5, borderRadius: 2 }}
              >
                {roomLoading ? (
                  <CircularProgress size={26} color="inherit" />
                ) : (
                  "Join Room"
                )}
              </Button>
            </form>
          </Paper>
        </Box>
      ) : (
        <>
          <RoomTabs announcements={announcements} roomId={joinedRoom.room_id} />

          {/* Announcements feed */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 10 }}>
              <CircularProgress />
            </Box>
          ) : announcements.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 3,
                border: "1px dashed rgba(0, 0, 0, 0.15)",
                bgcolor: "grey.50",
              }}
            >
              <CampaignIcon
                sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No announcements in this room
              </Typography>
              <Typography variant="body2" color="text.disabled">
                When the officer posts an announcement, it will appear here.
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
              {announcements.map((announcement) => (
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
