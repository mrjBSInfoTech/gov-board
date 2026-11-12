import React, { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  Slide,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CampaignIcon from "@mui/icons-material/Campaign";

import AnnouncementCard from "../../components/officer/Announcement/AnnouncementCard";
import AnnouncementForm from "../../components/officer/Announcement/AnnouncementForm";
import AnnouncementDelete from "../../components/officer/Announcement/AnnouncementDelete";
import RoomTabs from "../../components/room/RoomTabs";
import RoomLeaveDialog from "../../components/room/RoomLeaveDialog";
import RoomJoinRequestsDialog from "../../components/room/RoomJoinRequestsDialog";

import {
  fetchAnnouncements,
  leaveRoom,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../../api/officer/announcementAPI";
import {
  fetchMyRoom,
  fetchMyRooms,
  requestRoomJoin,
} from "../../api/roomAPI";
import RoomLevelBar from "../../components/room/RoomLevelBar";
import { canManageGovernanceSection } from "../../utils/governanceAccess";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function AnnouncementPage({ governancePage = false, readOnly = false }) {
  const { roomId: routeRoomId } = useParams();
  const isRoomHub = Boolean(routeRoomId);
  const roomIdFromRoute = Number(routeRoomId);
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomContextLoading, setRoomContextLoading] = useState(isRoomHub);
  const [resolvedRoomId, setResolvedRoomId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Room states
  const [joinedRoom, setJoinedRoom] = useState(() => {
    if (routeRoomId) return null;
    const savedRoom = localStorage.getItem("joinedRoom");
    return savedRoom ? JSON.parse(savedRoom) : null;
  });
  const activeRoomId = useRef(joinedRoom?.room_id);
  activeRoomId.current = isRoomHub ? roomIdFromRoute : joinedRoom?.room_id;
  const hasCurrentRoom = Boolean(
    joinedRoom &&
      (!isRoomHub || Number(joinedRoom.room_id) === roomIdFromRoute),
  );
  const [myRooms, setMyRooms] = useState([]);
  const canManageAnnouncements =
    joinedRoom?.member_type === "officer" &&
    canManageGovernanceSection(joinedRoom.position, "announcement") &&
    !readOnly;
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Action loading states
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);

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
  const loadAnnouncements = useCallback(async (roomId) => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnnouncements(roomId, governancePage);
      if (activeRoomId.current === roomId) setAnnouncements(data || []);
    } catch (err) {
      console.error("Error loading announcements:", err);
      if (activeRoomId.current === roomId) {
        setError(err.message || "Failed to load announcements.");
      }
    } finally {
      if (activeRoomId.current === roomId) setLoading(false);
    }
  }, [governancePage]);

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
  }, [joinedRoom, isRoomHub, roomIdFromRoute, loadAnnouncements]);

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
          localStorage.setItem("joinedRoom", JSON.stringify(room));
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
        if (selectedRoom) {
          localStorage.setItem("joinedRoom", JSON.stringify(selectedRoom));
        } else {
          localStorage.removeItem("joinedRoom");
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
  }, [isRoomHub, roomIdFromRoute, routeRoomId]);

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
      setError(err.message || "Invalid room code.");
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
      if (nextRoom) localStorage.setItem("joinedRoom", JSON.stringify(nextRoom));
      else localStorage.removeItem("joinedRoom");
      setAnnouncements([]);
      setRoomCodeInput("");
      window.dispatchEvent(new Event("room-membership-updated"));
      if (isRoomHub) navigate("/officer/rooms/main");
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
    localStorage.setItem("joinedRoom", JSON.stringify(room));
    window.dispatchEvent(new Event("room-membership-updated"));
  };

  // Handlers for Form
  const handleOpenAddForm = () => {
    setSelectedAnnouncement(null);
    setFormOpen(true);
  };

  const handleOpenEditForm = (announcement) => {
    setSelectedAnnouncement(announcement);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (!formLoading) {
      setFormOpen(false);
      setSelectedAnnouncement(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      const payload = { ...formData, room_id: joinedRoom?.room_id };
      if (selectedAnnouncement?.announcement_id) {
        await updateAnnouncement(selectedAnnouncement.announcement_id, payload);
        showSnackbar("Announcement updated successfully!", "success");
      } else {
        await addAnnouncement(payload);
        showSnackbar("Announcement created successfully!", "success");
      }
      handleCloseForm();
      await loadAnnouncements(joinedRoom.room_id);
    } catch (err) {
      console.error("Form submit error:", err);
      showSnackbar(err.message || "Failed to save announcement", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Handlers for Delete
  const handleOpenDeleteDialog = (announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    if (!deleteLoading) {
      setDeleteOpen(false);
      setSelectedAnnouncement(null);
    }
  };

  const handleDeleteConfirm = async (id) => {
    setDeleteLoading(true);
    try {
      await deleteAnnouncement(id, joinedRoom.room_id);
      showSnackbar("Announcement deleted successfully!", "success");
      handleCloseDeleteDialog();
      await loadAnnouncements(joinedRoom.room_id);
    } catch (err) {
      console.error("Delete error:", err);
      showSnackbar(err.message || "Failed to delete announcement", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter announcements based on search term
  const filteredAnnouncements = announcements.filter((item) => {
    const term = searchTerm.toLowerCase();
    const bodyMatch = (item.announcement_body || "")
      .toLowerCase()
      .includes(term);
    const linkMatch = (item.link || "").toLowerCase().includes(term);
    return bodyMatch || linkMatch;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>{governancePage ? "Announcement" : isRoomHub ? "Hub" : "Announcements"}</title>
      </Helmet>

      {/* Header section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
          >
            {governancePage
              ? `Announcement${hasCurrentRoom ? ` - ${joinedRoom.room_name}` : ""}`
              : isRoomHub
              ? `Hub${hasCurrentRoom ? ` - ${joinedRoom.room_name}` : ""}`
              : `Announcements${hasCurrentRoom ? ` - ${joinedRoom.room_name}` : ""}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {governancePage && hasCurrentRoom
              ? `Making announcements for room ${joinedRoom.room_number}`
              : hasCurrentRoom
              ? canManageAnnouncements
                ? `Managing announcements for room ${joinedRoom.room_number}`
                : `Viewing announcements for room ${joinedRoom.room_number} as a student member`
              : isRoomHub
                ? "Loading room details"
                : "Join a room to manage and post announcements"}
          </Typography>
        </Box>

        {isRoomHub && !governancePage && (
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
            {hasCurrentRoom && canManageAnnouncements && (
              <Button
                variant="outlined"
                onClick={() => setJoinRequestsOpen(true)}
              >
                Join Request
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => navigate("/officer/rooms/main")}
            >
              All Rooms
            </Button>
          </Box>
        )}

        {governancePage && hasCurrentRoom && canManageAnnouncements && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddForm}
            sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: "bold", textTransform: "none" }}
          >
            Add Announcement
          </Button>
        )}

        {joinedRoom && !isRoomHub && (
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              flexWrap: "wrap",
              alignItems: { sm: "center" },
              gap: 1,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            {myRooms.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="officer-room-picker-label">Your rooms</InputLabel>
                <Select
                  labelId="officer-room-picker-label"
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
            <Button
              variant="outlined"
              color="error"
              onClick={() => setLeaveDialogOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: "bold",
              }}
            >
              Leave Room
            </Button>
            {canManageAnnouncements && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenAddForm}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontWeight: "bold",
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                }}
              >
                Add Announcement
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Join Room Form */}
      {!isRoomHub && !hasCurrentRoom && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 3,
            borderRadius: 3,
            border: "1px solid rgba(0, 0, 0, 0.08)",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 500,
            mx: "auto",
            mt: 4,
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
            Enter a room code to view and manage its announcements.
          </Typography>

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
      )}

      {/* Search Bar */}
      {!governancePage && hasCurrentRoom && !roomContextLoading && (
        <RoomLevelBar
          key={joinedRoom.room_id}
          roomId={joinedRoom.room_id}
          roomName={joinedRoom.room_name}
        />
      )}

      {hasCurrentRoom && !roomContextLoading && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            border: "1px solid rgba(0, 0, 0, 0.08)",
            bgcolor: "background.paper",
          }}
        >
          <TextField
            fullWidth
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      )}

      {hasCurrentRoom &&
        !roomContextLoading &&
        !governancePage &&
        (!isRoomHub || Number(joinedRoom.room_id) === roomIdFromRoute) && (
        <Box sx={{ mb: 3 }}>
          <RoomTabs
            key={joinedRoom.room_id}
            announcements={announcements}
            roomId={joinedRoom.room_id}
            canSubmitBudgetContributions
            budgetContributorType="officer"
          />
        </Box>
      )}

      <RoomJoinRequestsDialog
        open={!governancePage && joinRequestsOpen}
        onClose={() => setJoinRequestsOpen(false)}
        roomId={joinedRoom?.room_id}
      />
      <RoomLeaveDialog
        open={!governancePage && leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
        onConfirm={handleLeaveRoom}
        loading={leaveLoading}
      />

      {/* Error state */}
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
          sx={{ m: 2 }}
          action={
            <Button color="inherit" onClick={() => navigate("/officer/rooms/main")}>
              All Rooms
            </Button>
          }
        >
          {error || "This room is unavailable to your account."}
        </Alert>
      ) : null}

      {error && (!isRoomHub || hasCurrentRoom) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {hasCurrentRoom && !roomContextLoading &&
        (loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 300,
            }}
          >
            <CircularProgress />
          </Box>
        ) : filteredAnnouncements.length === 0 ? (
          /* Empty state */
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
              {searchTerm
                ? "No announcements found matching your search"
                : "No announcements in this room"}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
              {searchTerm
                ? "Try adjusting your search query."
                : canManageAnnouncements
                  ? "Click the button below to create your first announcement."
                  : "There are no announcements in this room yet."}
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
                <AnnouncementCard
                  announcement={announcement}
                  onEdit={
                    canManageAnnouncements && announcement.source_type !== "governance"
                      ? handleOpenEditForm
                      : undefined
                  }
                  onDelete={
                    canManageAnnouncements && announcement.source_type !== "governance"
                      ? handleOpenDeleteDialog
                      : undefined
                  }
                />
              </Box>
            ))}
          </Box>
        ))}

      {/* Modal Dialogs */}
      <AnnouncementForm
        open={formOpen}
        handleClose={handleCloseForm}
        initialData={selectedAnnouncement}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />

      <AnnouncementDelete
        open={deleteOpen}
        handleClose={handleCloseDeleteDialog}
        selectedAnnouncement={selectedAnnouncement}
        onDelete={handleDeleteConfirm}
        loading={deleteLoading}
      />

      {/* Snackbar Notification */}
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
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
