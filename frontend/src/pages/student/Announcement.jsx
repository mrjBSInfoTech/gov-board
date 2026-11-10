import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  leaveRoom,
} from "../../api/student/announcementAPI";
import {
  fetchMyRoom,
  fetchMyRooms,
  requestRoomJoin,
} from "../../api/roomAPI";
import RoomLevelBar from "../../components/room/RoomLevelBar";
import RoomLeaveDialog from "../../components/room/RoomLeaveDialog";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function AnnouncementPage() {
  const { roomId: routeRoomId } = useParams();
  const isRoomHub = Boolean(routeRoomId);
  const roomIdFromRoute = Number(routeRoomId);
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomContextLoading, setRoomContextLoading] = useState(isRoomHub);
  const [resolvedRoomId, setResolvedRoomId] = useState(null);
  const studentId = localStorage.getItem("student_student_id");
  const joinedRoomStorageKey = studentId
    ? `studentJoinedRoom:${studentId}`
    : null;

  // Room states
  const [joinedRoom, setJoinedRoom] = useState(() => {
    if (routeRoomId) return null;
    const currentStudentId = localStorage.getItem("student_student_id");
    const savedRoom = currentStudentId
      ? localStorage.getItem(`studentJoinedRoom:${currentStudentId}`)
      : null;
    localStorage.removeItem("studentJoinedRoom");
    return savedRoom ? JSON.parse(savedRoom) : null;
  });
  const activeRoomId = useRef(joinedRoom?.room_id);
  activeRoomId.current = isRoomHub ? roomIdFromRoute : joinedRoom?.room_id;
  const hasCurrentRoom = Boolean(
    joinedRoom &&
      (!isRoomHub || Number(joinedRoom.room_id) === roomIdFromRoute),
  );
  const [myRooms, setMyRooms] = useState([]);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

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
      if (activeRoomId.current === roomId) setAnnouncements(data || []);
    } catch (err) {
      console.error("Error loading announcements:", err);
      if (activeRoomId.current === roomId) {
        setError(err.message || "Failed to load announcements.");
      }
    } finally {
      if (activeRoomId.current === roomId) setLoading(false);
    }
  };

  useEffect(() => {
    if (
      joinedRoom &&
      (!isRoomHub || Number(joinedRoom.room_id) === roomIdFromRoute)
    ) {
      loadAnnouncements(joinedRoom.room_id);
    } else {
      setAnnouncements([]);
      setLoading(false);
    }
  }, [joinedRoom, joinedRoomStorageKey, isRoomHub, roomIdFromRoute]);

  useEffect(() => {
    let active = true;
    if (isRoomHub) {
      setRoomContextLoading(true);
      setJoinedRoom(null);
      setAnnouncements([]);
      setError(null);
      fetchMyRoom(roomIdFromRoute)
        .then((room) => {
          if (!active) return;
          setResolvedRoomId(routeRoomId);
          if (!room) {
            setError("You are not a member of this room.");
            return;
          }
          setJoinedRoom(room);
          if (joinedRoomStorageKey) {
            localStorage.setItem(joinedRoomStorageKey, JSON.stringify(room));
          }
        })
        .catch((loadError) => {
          if (active) {
            setResolvedRoomId(routeRoomId);
            setError(loadError.message || "Unable to load this room.");
          }
        })
        .finally(() => {
          if (active) setRoomContextLoading(false);
        });
      return () => {
        active = false;
      };
    }

    Promise.all([fetchMyRoom(), fetchMyRooms()])
      .then(([room, rooms]) => {
        if (!active) return;
        setMyRooms(rooms);
        const selectedRoom = room || rooms[0] || null;
        setJoinedRoom(selectedRoom);
        if (selectedRoom && joinedRoomStorageKey) {
          localStorage.setItem(joinedRoomStorageKey, JSON.stringify(selectedRoom));
        } else if (joinedRoomStorageKey) {
          localStorage.removeItem(joinedRoomStorageKey);
        }
        window.dispatchEvent(new Event("room-membership-updated"));
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load your room. Please try again.");
      });

    return () => {
      active = false;
    };
  }, [joinedRoomStorageKey, isRoomHub, roomIdFromRoute, routeRoomId]);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    setRoomLoading(true);
    setError(null);
    try {
      const result = await requestRoomJoin(roomCodeInput.trim());
      setRoomCodeInput("");
      showSnackbar(result.message, "success");
    } catch (err) {
      showSnackbar(err.message || "Invalid room code.", "error");
    } finally {
      setRoomLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    setLeaveLoading(true);
    try {
      await leaveRoom(joinedRoom?.room_id);
      setLeaveDialogOpen(false);
      const rooms = await fetchMyRooms();
      const nextRoom = rooms[0] || null;
      setMyRooms(rooms);
      setJoinedRoom(nextRoom);
      if (nextRoom) {
        localStorage.setItem(joinedRoomStorageKey, JSON.stringify(nextRoom));
      } else if (joinedRoomStorageKey) {
        localStorage.removeItem(joinedRoomStorageKey);
      }
      setAnnouncements([]);
      setRoomCodeInput("");
      window.dispatchEvent(new Event("room-membership-updated"));
      if (isRoomHub) navigate("/student/rooms/main");
      showSnackbar(nextRoom ? `You left the room. Switched to ${nextRoom.room_name}.` : "You left the room.", "success");
    } catch (err) {
      setError(err.message || "Unable to leave room.");
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleRoomChange = (event) => {
    const room = myRooms.find(
      (item) => item.room_id === Number(event.target.value),
    );
    if (!room) return;
    setJoinedRoom(room);
    setAnnouncements([]);
    if (joinedRoomStorageKey) {
      localStorage.setItem(joinedRoomStorageKey, JSON.stringify(room));
    }
    window.dispatchEvent(new Event("room-membership-updated"));
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
        <title>{isRoomHub ? "Hub" : "Announcements"}</title>
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
            {isRoomHub
              ? `Hub${hasCurrentRoom ? ` - ${joinedRoom.room_name}` : ""}`
              : `Announcements${hasCurrentRoom ? ` - ${joinedRoom.room_name}` : ""}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hasCurrentRoom
              ? `Viewing announcements for room ${joinedRoom.room_number}`
              : isRoomHub
                ? "Loading room details"
                : "Join a room to view announcements"}
          </Typography>
        </Box>

        {isRoomHub && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {hasCurrentRoom && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => setLeaveDialogOpen(true)}
              >
                Leave Room
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => navigate("/student/rooms/main")}
            >
              All Rooms
            </Button>
          </Box>
        )}

        {joinedRoom && !isRoomHub && (
          <>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1,
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {myRooms.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="student-room-picker-label">Your rooms</InputLabel>
                  <Select
                    labelId="student-room-picker-label"
                    value={joinedRoom.room_id}
                    label="Your rooms"
                    onChange={handleRoomChange}
                  >
                    {myRooms.map((room) => (
                      <MenuItem key={room.room_id} value={room.room_id}>
                        {room.room_name} ({room.member_type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Box
                component="form"
                onSubmit={handleJoinRoom}
                sx={{ display: "flex", gap: 1 }}
              >
                <TextField
                  size="small"
                  label="Request another room"
                  value={roomCodeInput}
                  onChange={(event) => setRoomCodeInput(event.target.value)}
                  disabled={roomLoading}
                  sx={{ width: { xs: 170, sm: 190 } }}
                />
                <Button
                  type="submit"
                  variant="outlined"
                  disabled={!roomCodeInput.trim() || roomLoading}
                >
                  Join
                </Button>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setLeaveDialogOpen(true)}
              sx={{ borderRadius: 2, fontWeight: "bold" }}
            >
              Leave Room
            </Button>
          </>
        )}
      </Box>

      <RoomLeaveDialog
        open={leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
        onConfirm={handleLeaveRoom}
        loading={leaveLoading}
      />

      {/* Main Content Area */}
      {isRoomHub &&
      (roomContextLoading ||
        resolvedRoomId !== routeRoomId ||
        (!hasCurrentRoom && !error)) ? (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
          <CircularProgress />
        </Box>
      ) : isRoomHub && !hasCurrentRoom ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => navigate("/student/rooms/main")}>
              All Rooms
            </Button>
          }
        >
          {error || "This room is unavailable to your account."}
        </Alert>
      ) : !hasCurrentRoom ? (
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
                {roomLoading ? "Requesting..." : "Request to Join"}
              </Button>
            </Box>
          </Paper>
        </Box>
      ) : (
        <>
          <RoomLevelBar
            key={joinedRoom.room_id}
            roomId={joinedRoom.room_id}
            roomName={joinedRoom.room_name}
          />

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
              key={joinedRoom.room_id}
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
                  : "When an officer or administrator posts an announcement for your college, it will appear here."}
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
                  key={`${announcement.source_type}-${announcement.announcement_id}`}
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
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%", color: "white" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
