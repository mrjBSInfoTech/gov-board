import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { fetchMyRoom, fetchRoomQuests } from "../api/roomAPI";

export default function Quest() {
  const [room, setRoom] = useState(null);
  const [questData, setQuestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const loadQuests = async () => {
      const currentRequest = ++requestId.current;
      setRoom(null);
      setQuestData(null);
      setLoading(true);
      setError("");

      try {
        const currentRoom = await fetchMyRoom();
        if (currentRequest !== requestId.current) return;
        setRoom(currentRoom);

        if (!currentRoom) return;

        const data = await fetchRoomQuests(currentRoom.room_id);
        if (currentRequest === requestId.current) {
          setQuestData(data);
        }
      } catch (loadError) {
        if (currentRequest === requestId.current) {
          console.error("Unable to load room quests:", loadError);
          setError(loadError.message || "Unable to load room quests.");
        }
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false);
        }
      }
    };

    loadQuests();
    window.addEventListener("room-membership-updated", loadQuests);
    window.addEventListener("storage", loadQuests);

    return () => {
      requestId.current += 1;
      window.removeEventListener("room-membership-updated", loadQuests);
      window.removeEventListener("storage", loadQuests);
    };
  }, []);

  const level = questData?.room_level;
  const progress = level
    ? Math.min(100, (level.current_level_exp / level.next_level_exp) * 100)
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Quest</title>
      </Helmet>

      <Typography
        variant="h4"
        sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 }, mb: 1 }}
      >
        Daily Quests
      </Typography>
      <Typography color="text.secondary">
        Complete daily activities to earn experience for your room.
      </Typography>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && !room && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Join a room to view and complete its daily quests.
        </Alert>
      )}

      {!loading && !error && room && questData && (
        <>
          <Paper sx={{ mt: 3, p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  {room.room_name}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
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
              {level.current_level_exp} / {level.next_level_exp} EXP to the next
              level
            </Typography>
          </Paper>

          <Stack spacing={2} sx={{ mt: 3 }}>
            {questData.tasks.map((task) => (
              <Card key={`${room.room_id}-${questData.day_key}-${task.id}`}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {task.completed ? (
                      <CheckCircleOutlineIcon color="success" />
                    ) : (
                      <RadioButtonUncheckedIcon color="disabled" />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        spacing={0.5}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {task.title}
                        </Typography>
                        <Typography
                          color={task.completed ? "success.main" : "primary"}
                          sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                        >
                          {task.completed
                            ? `Completed · +${task.exp_awarded} EXP`
                            : `+${task.exp} EXP`}
                        </Typography>
                      </Stack>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        {task.description}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Quests reset daily at 4:00 AM {questData.time_zone}.
          </Typography>
        </>
      )}
    </Box>
  );
}
