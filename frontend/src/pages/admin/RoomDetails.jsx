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
import CampaignIcon from "@mui/icons-material/Campaign";
import { fetchRoom, fetchRoomAnnouncements } from "../../api/admin/roomAPI";
import AnnouncementCard from "../../components/officer/Announcement/AnnouncementCard";

export default function RoomDetails() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const roomData = await fetchRoom(roomId);
        setRoom(roomData);
        
        const announcementsData = await fetchRoomAnnouncements(roomId);
        setAnnouncements(announcementsData || []);
      } catch (err) {
        setError(err.message || "Failed to load room details");
      } finally {
        setLoading(false);
      }
    };
    loadData();
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
      ) : loading || !room ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 4 }}>
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

          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Announcements ({announcements.length})
          </Typography>

          {announcements.length === 0 ? (
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
              <CampaignIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No announcements in this room
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              {announcements.map((announcement) => (
                <Box key={announcement.announcement_id} sx={{ width: "100%", maxWidth: 600 }}>
                  <AnnouncementCard
                    announcement={announcement}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
