import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import RoomLeaveDialog from "../components/room/RoomLeaveDialog";
import { fetchMyRooms, requestRoomJoin } from "../api/roomAPI";
import { leaveRoom as leaveOfficerRoom } from "../api/officer/announcementAPI";
import { leaveRoom as leaveStudentRoom } from "../api/student/announcementAPI";

export default function RoomMain({ role }) {
  const isOfficer = role === "officer";
  const basePath = `/${role}`;
  const leaveRoom = isOfficer ? leaveOfficerRoom : leaveStudentRoom;
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const loadRequestId = useRef(0);

  const selectionStorageKey = isOfficer
    ? "joinedRoom"
    : `studentJoinedRoom:${localStorage.getItem("student_student_id")}`;

  const loadRooms = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    try {
      const currentRooms = await fetchMyRooms();
      if (requestId === loadRequestId.current) {
        setRooms(currentRooms);
        setError("");
      }
    } catch (loadError) {
      if (requestId === loadRequestId.current) {
        setError(loadError.message || "Unable to load your rooms.");
      }
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
    window.addEventListener("room-membership-updated", loadRooms);
    return () => window.removeEventListener("room-membership-updated", loadRooms);
  }, [loadRooms]);

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!roomCode.trim() || joining) return;

    setJoining(true);
    setError("");
    setSuccess("");
    try {
      const result = await requestRoomJoin(roomCode.trim());
      setRoomCode("");
      setSuccess(result.message);
    } catch (joinError) {
      setError(joinError.message || "Unable to join this room.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!selectedRoom || leaving) return;
    setLeaving(true);
    setError("");
    try {
      await leaveRoom(selectedRoom.room_id);
      const updatedRooms = await fetchMyRooms();
      setRooms(updatedRooms);
      let savedRoomId = null;
      try {
        savedRoomId = JSON.parse(
          localStorage.getItem(selectionStorageKey) || "null",
        )?.room_id;
      } catch (storageError) {
        console.error("Unable to read the saved room selection:", storageError);
      }
      if (
        Number(savedRoomId) === Number(selectedRoom.room_id) ||
        savedRoomId === null ||
        savedRoomId === undefined
      ) {
        const nextRoom = updatedRooms[0];
        if (nextRoom) localStorage.setItem(selectionStorageKey, JSON.stringify(nextRoom));
        else localStorage.removeItem(selectionStorageKey);
      }
      setSelectedRoom(null);
      window.dispatchEvent(new Event("room-membership-updated"));
    } catch (leaveError) {
      setError(leaveError.message || "Unable to leave this room.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Rooms</title>
      </Helmet>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Rooms
          </Typography>
          <Typography color="text.secondary">
            Open one of your rooms or request access with a room code.
          </Typography>
        </Box>
        <Box
          component="form"
          onSubmit={handleJoin}
          sx={{
            display: "flex",
            gap: 1,
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <TextField
            size="small"
            label="Room code"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
            disabled={joining}
            inputProps={{ "aria-label": "Room code" }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!roomCode.trim() || joining}
          >
            {joining ? "Requesting..." : "Request to Join"}
          </Button>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : rooms.length === 0 ? (
        <Box
          sx={{
            minHeight: 240,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 3,
            p: 3,
          }}
        >
          <Box>
            <MeetingRoomIcon sx={{ fontSize: 48, color: "text.disabled" }} />
            <Typography variant="h6" sx={{ mt: 1 }}>
              No rooms yet
            </Typography>
            <Typography color="text.secondary">
              Enter a room code above to request access to a room.
            </Typography>
          </Box>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {rooms.map((room) => (
            <Grid key={room.room_id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
                <CardContent>
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 750 }}>
                        {room.room_name}
                      </Typography>
                      {room.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {room.description}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {room.college || "College room"} · Code {room.room_number}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={
                        room.member_type === "officer"
                          ? room.position || "Officer"
                          : "Student"
                      }
                      color={room.member_type === "officer" ? "primary" : "default"}
                    />
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, justifyContent: "space-between" }}>
                  <Button
                    variant="contained"
                    onClick={() =>
                      navigate(`${basePath}/rooms/${room.room_id}/hub`)
                    }
                  >
                    Open Hub
                  </Button>
                  <Button
                    color="error"
                    onClick={() => setSelectedRoom(room)}
                  >
                    Leave
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <RoomLeaveDialog
        open={Boolean(selectedRoom)}
        onClose={() => !leaving && setSelectedRoom(null)}
        onConfirm={handleLeave}
        loading={leaving}
      />
    </Box>
  );
}
