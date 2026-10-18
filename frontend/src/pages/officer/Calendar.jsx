import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  updateCalendarEvent,
} from "../../api/officer/calendarAPI";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Date(2020, index, 1).toLocaleString("en-US", { month: "long" }),
);
const REMINDER_OPTIONS = [
  { value: "", label: "No reminder" },
  { value: "0", label: "At event time" },
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

const pad = (value) => String(value).padStart(2, "0");
const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDateKey = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const eventDateKey = (event) => String(event.start_at).slice(0, 10);
const eventTime = (event) => String(event.start_at).slice(11, 16);
const endTime = (event) => (event.end_at ? String(event.end_at).slice(11, 16) : "");
const emptyForm = (date) => ({
  title: "",
  description: "",
  date,
  startTime: "09:00",
  endTime: "10:00",
  reminder_minutes: "",
});

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const offset = index - firstDay + 1;
    if (offset < 1) {
      const date = new Date(year, month - 1, previousMonthDays + offset);
      return { date, currentMonth: false };
    }
    if (offset > daysInMonth) {
      const date = new Date(year, month + 1, offset - daysInMonth);
      return { date, currentMonth: false };
    }
    return { date: new Date(year, month, offset), currentMonth: true };
  });
}

export default function Calendar() {
  const todayKey = toDateKey(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventListOpen, setEventListOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyForm(todayKey));

  const loadEvents = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setEvents(await fetchCalendarEvents());
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const calendarDays = useMemo(
    () => getCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const eventsByDate = useMemo(() => {
    const grouped = {};
    events.forEach((event) => {
      const key = eventDateKey(event);
      grouped[key] = grouped[key] ? [...grouped[key], event] : [event];
    });
    return grouped;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return events;
    return events.filter((event) =>
      `${event.title} ${event.description || ""} ${eventDateKey(event)}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [events, searchTerm]);

  const selectedEvents = (eventsByDate[selectedDate] || []).filter((event) =>
    filteredEvents.includes(event),
  );

  const moveMonth = (amount) =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + amount, 1));

  const openCreateDialog = (dateKey = selectedDate) => {
    setEditingEvent(null);
    setForm(emptyForm(dateKey));
    setDialogOpen(true);
  };

  const openEventList = (dateKey) => {
    setSelectedDate(dateKey);
    setEventListOpen(true);
  };

  const openEditDialog = (event) => {
    setEventListOpen(false);
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || "",
      date: eventDateKey(event),
      startTime: eventTime(event),
      endTime: endTime(event),
      reminder_minutes:
        event.reminder_minutes === null ? "" : String(event.reminder_minutes),
    });
    setDialogOpen(true);
  };

  const handleDateSearch = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const date = parseDateKey(value);
    setSelectedDate(value);
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (form.date < todayKey) {
      setErrorMessage("Events can only be scheduled for today or a future date.");
      return;
    }
    setSaving(true);
    setErrorMessage("");
    const payload = {
      title: form.title,
      description: form.description,
      start_at: `${form.date} ${form.startTime}:00`,
      end_at: form.endTime ? `${form.date} ${form.endTime}:00` : "",
      reminder_minutes: form.reminder_minutes,
    };
    try {
      if (editingEvent) {
        await updateCalendarEvent(editingEvent.event_id, payload);
      } else {
        await createCalendarEvent(payload);
      }
      setDialogOpen(false);
      setSelectedDate(form.date);
      const date = parseDateKey(form.date);
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
      await loadEvents();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    try {
      setErrorMessage("");
      await deleteCalendarEvent(event.event_id);
      await loadEvents();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const updateForm = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Event Handlers Calendar</title>
      </Helmet>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
            Event Handlers
          </Typography>
          <Typography color="text.secondary">
            Plan events, assignments, reminders, and important dates.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreateDialog()}>
          Add event
        </Button>
      </Stack>

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage("")} sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton aria-label="Previous month" onClick={() => moveMonth(-1)}>
              <ChevronLeftIcon />
            </IconButton>
            <TextField
              select
              size="small"
              value={viewDate.getMonth()}
              onChange={(event) =>
                setViewDate(new Date(viewDate.getFullYear(), Number(event.target.value), 1))
              }
              sx={{ minWidth: 140 }}
            >
              {MONTHS.map((month, index) => (
                <MenuItem key={month} value={index}>
                  {month}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              value={viewDate.getFullYear()}
              onChange={(event) =>
                setViewDate(new Date(Number(event.target.value), viewDate.getMonth(), 1))
              }
              sx={{ width: 110 }}
            >
              {Array.from({ length: 21 }, (_, index) => viewDate.getFullYear() - 10 + index).map(
                (year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ),
              )}
            </TextField>
            <IconButton aria-label="Next month" onClick={() => moveMonth(1)}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title or date"
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} /> }}
            />
            <TextField
              size="small"
              type="date"
              label="Go to date"
              value={selectedDate}
              onChange={(event) => handleDateSearch(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.75 }}>
          {WEEKDAYS.map((day) => (
            <Typography key={day} variant="caption" sx={{ textAlign: "center", fontWeight: 700, py: 1 }}>
              {day}
            </Typography>
          ))}
          {calendarDays.map(({ date, currentMonth }) => {
            const dateKey = toDateKey(date);
            const dayEvents = (eventsByDate[dateKey] || []).filter((event) =>
              filteredEvents.includes(event),
            );
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === todayKey;
            return (
              <Box
                key={dateKey}
                component="button"
                type="button"
                onClick={() => {
                  openEventList(dateKey);
                  if (!currentMonth) {
                    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
                  }
                }}
                sx={{
                  minHeight: { xs: 72, sm: 108 },
                  p: 1,
                  textAlign: "left",
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  borderRadius: 2,
                  backgroundColor: isSelected ? "action.selected" : "background.paper",
                  opacity: currentMonth ? 1 : 0.45,
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    display: "inline-flex",
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    fontWeight: isToday || isSelected ? 800 : 500,
                    color: isToday ? "primary.contrastText" : "text.primary",
                    backgroundColor: isToday ? "primary.main" : "transparent",
                    "&:hover": { backgroundColor: "primary.light", color: "primary.contrastText" },
                  }}
                >
                  {date.getDate()}
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {dayEvents.slice(0, 2).map((event) => (
                    <Typography
                      key={event.event_id}
                      component="span"
                      sx={{
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: { xs: 10, sm: 12 },
                        backgroundColor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    >
                      {event.title}
                    </Typography>
                  ))}
                  {dayEvents.length > 2 && (
                    <Typography variant="caption" color="text.secondary">
                      +{dayEvents.length - 2} more
                    </Typography>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Paper>

      <Dialog
        open={eventListOpen}
        onClose={() => setEventListOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {parseDateKey(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : selectedEvents.length ? (
            <Stack spacing={1.5}>
              {selectedEvents.map((event) => (
                <Paper key={event.event_id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{event.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {eventTime(event)}
                        {event.end_at ? ` - ${endTime(event)}` : ""}
                        {event.reminder_minutes !== null
                          ? ` · Reminder: ${
                              event.reminder_minutes === 0
                                ? "at event time"
                                : `${event.reminder_minutes} minutes before`
                            }`
                          : ""}
                      </Typography>
                      {event.description && (
                        <Typography sx={{ mt: 0.75 }}>{event.description}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" alignSelf={{ xs: "flex-start", sm: "center" }}>
                      <IconButton aria-label="Edit event" onClick={() => openEditDialog(event)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton aria-label="Delete event" onClick={() => handleDelete(event)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">No events scheduled for this date.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventListOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEventListOpen(false);
              openCreateDialog(selectedDate);
            }}
          >
            Add event
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingEvent ? "Edit event" : "Add event"}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Event title" value={form.title} onChange={updateForm("title")} required autoFocus />
              <TextField
                label="Event details or description"
                value={form.description}
                onChange={updateForm("description")}
                multiline
                minRows={3}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={updateForm("date")}
                  inputProps={{ min: todayKey }}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
                <TextField
                  label="Start time"
                  type="time"
                  value={form.startTime}
                  onChange={updateForm("startTime")}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
                <TextField
                  label="End time"
                  type="time"
                  value={form.endTime}
                  onChange={updateForm("endTime")}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              <TextField
                select
                label="Reminder"
                value={form.reminder_minutes}
                onChange={updateForm("reminder_minutes")}
              >
                {REMINDER_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : editingEvent ? "Save changes" : "Create event"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
