import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { fetchRoom } from "../../api/admin/roomAPI";

export default function RoomDetails() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRoom(roomId)
      .then(setRoom)
      .catch((err) => setError(err.message || "Failed to load room"));
  }, [roomId]);

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>{room?.room_name || "Room"}</title>
      </Helmet>

      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/admin/room")}
        sx={{ mb: 2 }}
      >
        Back to rooms
      </Button>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : !room ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {room.room_name}
          </Typography>
          <Typography color="text.secondary">
            Room code: <strong>{room.room_number}</strong>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Created: {new Date(room.date_created).toLocaleDateString()}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
