import {
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { fetchRoomLevel } from "../../api/roomAPI";

export default function RoomLevelBar({ roomId, roomName }) {
  const [level, setLevel] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadLevel = async () => {
      setLoading(true);
      setError("");

      try {
        const roomLevel = await fetchRoomLevel(roomId);
        if (active) setLevel(roomLevel);
      } catch (loadError) {
        if (active) {
          console.error("Unable to load room level:", loadError);
          setError(loadError.message || "Unable to load room level.");
          setLevel(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const handleXpUpdated = (event) => {
      if (Number(event.detail?.roomId) === Number(roomId)) {
        loadLevel();
      }
    };

    loadLevel();
    window.addEventListener("room-xp-updated", handleXpUpdated);

    return () => {
      active = false;
      window.removeEventListener("room-xp-updated", handleXpUpdated);
    };
  }, [roomId]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading room EXP...</Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!level) return null;

  const progress = Math.min(
    100,
    (level.current_level_exp / level.next_level_exp) * 100,
  );

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            {roomName}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Room Level {level.level}
          </Typography>
        </Box>
        <Typography color="text.secondary" sx={{ alignSelf: { sm: "end" } }}>
          {level.total_exp.toLocaleString()} total room EXP
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 10, borderRadius: 5 }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {level.current_level_exp} / {level.next_level_exp} EXP to next level
      </Typography>
    </Paper>
  );
}
