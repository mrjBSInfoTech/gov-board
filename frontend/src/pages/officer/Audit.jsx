import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import HistoryIcon from "@mui/icons-material/History";
import { Box, Paper, Stack, Typography } from "@mui/material";
import {
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SearchIcon from "@mui/icons-material/Search";
import { fetchAuditLogs } from "../../api/officer/auditLogAPI";
import { fetchMyRoom } from "../../api/roomAPI";
import { useTheme } from "@mui/material/styles";

export default function Audit() {
  const theme = useTheme();
  const [room, setRoom] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(null);
  const [period, setPeriod] = useState("all");
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    let active = true;

    const loadRoom = async () => {
      try {
        const currentRoom = await fetchMyRoom();
        if (!active) return;

        setRoom(currentRoom || null);
        if (currentRoom?.room_id) {
          localStorage.setItem("joinedRoom", JSON.stringify(currentRoom));
          await loadFunds(currentRoom.room_id);
        } else {
          setLoading(false);
          setFunds([]);
        }
      } catch (roomError) {
        if (!active) return;
        setLoading(false);
        setError(roomError.message || "Unable to load your room.");
      }
    };

    loadRoom();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (date && !date.isValid()) {
        setError("Please select a valid date.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const logs = await fetchAuditLogs(search, date, period);
        if (active) {
          setAuditLogs(logs);
          setVisibleCount(50);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, date, period]);

  const formatAndCapitalize = (data) => {
    if (!data) return "N/A";

    const list = Array.isArray(data)
      ? data
      : typeof data === "string"
        ? data.split(",")
        : [];

    if (list.length === 0) return "N/A";

    const formatted = list
      .map((item) => {
        if (typeof item !== "string") return "";
        const trimmed = item.trim();
        if (!trimmed) return "";

        return trimmed
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      })
      .filter(Boolean);
    return formatted.length > 0 ? formatted.join(", ") : "N/A";
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Audit</title>
      </Helmet>
      <Stack spacing={0.75} sx={{ mb: 3 }}>
        <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
          Oversight
        </Typography>
        <Typography variant="h4">
          Audit Logs
        </Typography>
        <Typography color="text.secondary">
          Review student and officer activity in your year and section.
        </Typography>
      </Stack>

      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mt: 2.5,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", lg: "center" },
            gap: 1.25,
            width: "100%",
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search logs..."
            size="small"
            sx={{
              width: { xs: "100%", lg: 280 },
              maxWidth: { lg: 300 },
              flex: { lg: 1 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1.5,
                "& fieldset": { borderColor: theme.palette.divider },
                "&:hover fieldset": {
                  borderColor: theme.palette.text.secondary,
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              justifyContent: { xs: "stretch", lg: "flex-end" },
              width: { xs: "100%", lg: "auto" },
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={date}
                onChange={(newDate) => setDate(newDate)}
                enableAccessibleFieldDOMStructure={false}
                slots={{ textField: TextField }}
                slotProps={{
                  textField: {
                    size: "small",
                    placeholder: "Select Date",
                    sx: {
                      width: { xs: "100%", sm: 180 },
                      minWidth: { xs: "100%", sm: 180 },
                      "& .MuiOutlinedInput-root": {
                        fontSize: 13,
                        color: theme.palette.text.primary,
                        backgroundColor: theme.palette.background.default,
                        borderRadius: 1.5,
                        "& fieldset": { borderColor: theme.palette.divider },
                        "&:hover fieldset": {
                          borderColor: theme.palette.text.secondary,
                        },
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 150 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              <Select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 1.5,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="hour">Last 1 hour</MenuItem>
                <MenuItem value="day">Last 1 day</MenuItem>
                <MenuItem value="week">Last 1 week</MenuItem>
                <MenuItem value="month">Last 1 month</MenuItem>
                <MenuItem value="year">Last 1 year</MenuItem>
                <MenuItem value="all">All time</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Table Section */}
      <Paper
        sx={{
          mt: 2,
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          {!loading && !error && (
            <Typography
              sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
            >
              Showing {Math.min(visibleCount, auditLogs.length)} of{" "}
              {auditLogs.length} entries
            </Typography>
          )}
        </Box>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper
            variant="outlined"
            sx={{
              minHeight: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              textAlign: "center",
              borderStyle: "dashed",
            }}
          >
            <Stack alignItems="center" spacing={1.25}>
              <HistoryIcon sx={{ fontSize: 38, color: "primary.main" }} />
              <Typography variant="h6">Could not fetch data</Typography>
              <Typography color="text.secondary" maxWidth={420}>
                Please check your internet connection or try again later.
              </Typography>
            </Stack>
          </Paper>
        ) : auditLogs.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              minHeight: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              textAlign: "center",
              borderStyle: "dashed",
            }}
          >
            <Stack alignItems="center" spacing={1.25}>
              <HistoryIcon sx={{ fontSize: 38, color: "primary.main" }} />
              <Typography variant="h6">No activity recorded yet</Typography>
              <Typography color="text.secondary" maxWidth={420}>
                Activity from students and officers in your section will appear
                here.
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead
                sx={{
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "background.table"
                      : "#f8fafc",
                }}
              >
                <TableRow>
                  {[
                    "Datetime",
                    "Action",
                    "Actor",
                    "Role",
                    "Status",
                    "Information",
                  ].map((heading) => (
                    <TableCell
                      key={heading}
                      sx={{
                        py: 1.5,
                        color: theme.palette.text.secondary,
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.slice(0, visibleCount).map((log) => (
                  <TableRow
                    key={log.audit_id}
                    sx={{
                      "&:hover": { backgroundColor: "action.hover" },
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell
                      sx={{
                        fontSize: 10,
                        whiteSpace: "nowrap",
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {new Date(log.datetime).toLocaleString()}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {String(log.action)
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {log.actor}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatAndCapitalize(log.role)}
                        size="small"
                        sx={{
                          height: 20,
                          borderRadius: 1,
                          backgroundColor:
                            theme.palette.mode === "dark"
                              ? "#334155"
                              : "#f1f5f9",
                          color: theme.palette.text.secondary,
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          String(log.status).charAt(0).toUpperCase() +
                          String(log.status).slice(1).toLowerCase()
                        }
                        size="small"
                        sx={{
                          height: 20,
                          minWidth: 58,
                          borderRadius: 1,
                          fontWeight: 700,
                          fontSize: 9,
                          color: ["success", "logged in", "online"].includes(
                            String(log.status).toLowerCase(),
                          )
                            ? "#15803d"
                            : ["failed", "error"].includes(
                                  String(log.status).toLowerCase(),
                                )
                              ? theme.palette.error.main
                              : theme.palette.text.secondary,
                          backgroundColor: [
                            "success",
                            "logged in",
                            "online",
                          ].includes(String(log.status).toLowerCase())
                            ? theme.palette.mode === "dark"
                              ? "rgba(34, 197, 94, 0.16)"
                              : "#dcfce7"
                            : theme.palette.mode === "dark"
                              ? "rgba(148, 163, 184, 0.16)"
                              : "#f1f5f9",
                        }}
                        color={
                          String(log.status).toLowerCase() === "success" ||
                          String(log.status).toLowerCase() === "logged in" ||
                          String(log.status).toLowerCase() === "online"
                            ? "success"
                            : String(log.status).toLowerCase() === "failed" ||
                                String(log.status).toLowerCase() === "error"
                              ? "error"
                              : "default"
                        }
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: 10,
                        color: theme.palette.text.secondary,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.information || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {auditLogs.length > 50 && (
              <Stack
                direction="row"
                justifyContent="center"
                spacing={1}
                sx={{ mt: 2 }}
              >
                {visibleCount < auditLogs.length && (
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setVisibleCount((count) =>
                        Math.min(count + 50, auditLogs.length),
                      )
                    }
                  >
                    More
                  </Button>
                )}
                {visibleCount > 50 && (
                  <Button variant="text" onClick={() => setVisibleCount(50)}>
                    Less
                  </Button>
                )}
              </Stack>
            )}
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
