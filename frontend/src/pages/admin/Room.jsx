import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Slide,
  Snackbar,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RoomCard from "../../components/admin/Room/RoomCard";
import RoomForm from "../../components/admin/Room/RoomForm";
import RoomDelete from "../../components/admin/Room/RoomDelete";
import { fetchRooms, addRoom, updateRoom, deleteRoom } from "../../api/admin/roomAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [openRoomForm, setOpenRoomForm] = useState(false);
  const [openRoomDelete, setOpenRoomDelete] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [roomErrorMessage, setRoomErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [loading, setLoading] = useState(true);

  // Fetch all rooms from API
  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await fetchRooms();
      setRooms(data || []);
    } catch (err) {
      console.error("Error loading rooms:", err);
      showSnackbar("Failed to load rooms: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Load rooms
  useEffect(() => {
    loadRooms();
  }, []);

  // ========== ROOM HANDLERS ==========
  // ➕ Open Add Room Modal
  const handleOpenRoomAdd = () => {
    setSelectedRoom(null);
    setOpenRoomForm(true);
  };

  // ✏️ Open Edit Room Modal
  const handleOpenRoomEdit = (room) => {
    setSelectedRoom(room);
    setOpenRoomForm(true);
  };

  // 🗑️ Open Delete Room Modal
  const handleOpenRoomDelete = (room) => {
    setSelectedRoom(room);
    setOpenRoomDelete(true);
  };

  // 📋 Copy room code to clipboard
  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showSnackbar(`Code "${code}" copied to clipboard!`, "success");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Submit (Add or Edit) Room
  const handleSubmitRoom = async (formData) => {
    try {
      if (selectedRoom) {
        await updateRoom(selectedRoom.room_id, formData);
        showSnackbar("Room updated successfully", "success");
      } else {
        await addRoom(formData);
        showSnackbar("Room added successfully", "success");
      }
      await loadRooms();
      setOpenRoomForm(false);
    } catch (err) {
      console.error("Error saving room:", err);
      showSnackbar(err.message || "Error saving room", "error");
    }
  };

  // Delete Room
  const handleDeleteRoom = async (id) => {
    try {
      await deleteRoom(id);
      await loadRooms();
      setOpenRoomDelete(false);
      showSnackbar("Room deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting room:", err);
      showSnackbar(err.message || "Error deleting room", "error");
    }
  };

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Room</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexDirection: { xs: "column", sm: "row" },
          mb: 3,
          gap: 1,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          Rooms
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenRoomAdd}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 35, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Create Room
        </Button>
      </Box>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        {/* Content */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : rooms.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              mt: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No rooms yet
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Click "Create Room" to add your first room.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<AddIcon />}
              onClick={handleOpenRoomAdd}
            >
              Create Room
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {rooms.map((room, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={room.room_id}>
                <RoomCard
                  room={room}
                  index={index}
                  onEdit={handleOpenRoomEdit}
                  onDelete={handleOpenRoomDelete}
                  onCopy={handleCopyCode}
                  copied={copiedId}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>


      {/* Modals */}
      <RoomForm
        open={openRoomForm}
        handleClose={() => setOpenRoomForm(false)}
        selectedRoom={selectedRoom}
        onSubmit={handleSubmitRoom}
      />
      <RoomDelete
        open={openRoomDelete}
        handleClose={() => setOpenRoomDelete(false)}
        selectedRoom={selectedRoom}
        onDelete={handleDeleteRoom}
      />

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": {
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
