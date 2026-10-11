import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { fetchCalendarEvents } from "../../api/officer/calendarAPI";
import { fetchStudentCalendarEvents } from "../../api/student/calendarAPI";

const toDate = (value) => new Date(String(value).replace(" ", "T"));

export default function CalendarEventsDialog({ open, onClose, roomId }) {
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDateValue, setToDateValue] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setLoading(true);
    setErrorMessage("");
    const loadEvents = localStorage.getItem("student_token")
      ? fetchStudentCalendarEvents(roomId)
      : fetchCalendarEvents(roomId);

    loadEvents
      .then((calendarEvents) => {
        if (active) setEvents(Array.isArray(calendarEvents) ? calendarEvents : []);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, roomId]);

  const filteredEvents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return events
      .filter((event) => {
        const eventDate = toDate(event.start_at);
        const dateKey = String(event.start_at).slice(0, 10);
        const timeKey = String(event.start_at).slice(11, 16);
        const matchesSearch =
          !keyword ||
          `${event.title} ${event.description || ""}`.toLowerCase().includes(keyword);
        const matchesFromDate = !fromDate || dateKey >= fromDate;
        const matchesToDate = !toDateValue || dateKey <= toDateValue;
        const matchesFromTime = !fromTime || timeKey >= fromTime;
        const matchesToTime = !toTime || timeKey <= toTime;
        return (
          matchesSearch &&
          matchesFromDate &&
          matchesToDate &&
          matchesFromTime &&
          matchesToTime &&
          !Number.isNaN(eventDate.getTime())
        );
      })
      .sort((first, second) => toDate(first.start_at) - toDate(second.start_at));
  }, [events, fromDate, fromTime, searchTerm, toDateValue, toTime]);

  const clearFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDateValue("");
    setFromTime("");
    setToTime("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Calendar events</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search event title or details"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              size="small"
              type="date"
              label="From date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              size="small"
              type="date"
              label="To date"
              value={toDateValue}
              onChange={(event) => setToDateValue(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              size="small"
              type="time"
              label="From time"
              value={fromTime}
              onChange={(event) => setFromTime(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              size="small"
              type="time"
              label="To time"
              value={toTime}
              onChange={(event) => setToTime(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button size="small" onClick={clearFilters}>
              Clear filters
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : errorMessage ? (
            <Alert severity="error">{errorMessage}</Alert>
          ) : filteredEvents.length ? (
            <Stack spacing={1}>
              {filteredEvents.map((event) => {
                const date = toDate(event.start_at);
                return (
                  <Paper key={event.event_id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{event.title}</Typography>
                        {event.description && (
                          <Typography variant="body2" color="text.secondary">
                            {event.description}
                          </Typography>
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ flexShrink: 0, textAlign: { sm: "right" } }}
                      >
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        <br />
                        {date.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {event.end_at &&
                          ` - ${toDate(event.end_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`}
                      </Typography>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              No events match the selected filters.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
