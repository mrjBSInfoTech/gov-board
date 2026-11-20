import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import HistoryIcon from "@mui/icons-material/History";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
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
import { fetchAuditLogs } from "../../api/admin/auditLogAPI";
import { useTheme } from "@mui/material/styles";
import { formatAuditInformation } from "../../utils/auditDisplay";

const reportHeaders = [
  "Datetime",
  "Action",
  "Actor",
  "Room ID",
  "Role",
  "Status",
  "Information",
];

const formatAuditRole = (data) => {
  if (!data) return "N/A";

  const list = Array.isArray(data)
    ? data
    : typeof data === "string"
      ? data.split(",")
      : [];
  const formatted = list
    .map((item) => {
      if (typeof item !== "string") return "";
      const trimmed = item.trim();
      if (!trimmed) return "";
      return trimmed
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    })
    .filter(Boolean);

  return formatted.length > 0 ? formatted.join(", ") : "N/A";
};

const getReportRows = (logs) =>
  logs.map((log) => [
    new Date(log.datetime).toLocaleString(),
    String(log.action)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    log.actor ?? "",
    log.room_id ?? "",
    formatAuditRole(log.role),
    String(log.status ?? "")
      .charAt(0)
      .toUpperCase() +
      String(log.status ?? "").slice(1).toLowerCase(),
    formatAuditInformation(log),
  ]);

const csvValue = (value) => {
  const text = value == null ? "" : String(value);
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const xmlEscape = (value) =>
  Array.from(String(value ?? ""))
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint === 0x9 ||
        codePoint === 0xa ||
        codePoint === 0xd ||
        (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
        (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
        (codePoint >= 0x10000 && codePoint <= 0x10ffff)
      );
    })
    .join("")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const htmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const downloadFile = (content, mimeType, filename) => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function Audit() {
  const theme = useTheme();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(null);
  const [period, setPeriod] = useState("all");
  const [visibleCount, setVisibleCount] = useState(50);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportError, setExportError] = useState("");

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

  const generateReport = () => {
    const rows = [reportHeaders, ...getReportRows(auditLogs)];
    const filename = `admin-audit-${new Date().toISOString().slice(0, 10)}`;

    try {
      if (exportFormat === "csv") {
        downloadFile(
          `\uFEFF${rows.map((row) => row.map(csvValue).join(",")).join("\r\n")}`,
          "text/csv;charset=utf-8",
          `${filename}.csv`,
        );
      } else if (exportFormat === "excel") {
        const workbookRows = rows
          .map(
            (row) =>
              `<Row>${row
                .map(
                  (cell) =>
                    `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`,
                )
                .join("")}</Row>`,
          )
          .join("");
        const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Admin Audit"><Table>${workbookRows}</Table></Worksheet>
</Workbook>`;
        downloadFile(
          workbook,
          "application/vnd.ms-excel;charset=utf-8",
          `${filename}.xls`,
        );
      } else {
        const popup = window.open("", "_blank");
        if (!popup) {
          throw new Error(
            "The PDF window was blocked. Allow pop-ups and try again.",
          );
        }
        popup.opener = null;
        const tableHeader = `<tr>${rows[0]
          .map((cell) => `<th>${htmlEscape(cell)}</th>`)
          .join("")}</tr>`;
        const tableBody = rows
          .slice(1)
          .map(
            (row) =>
              `<tr>${row
                .map((cell) => `<td>${htmlEscape(cell)}</td>`)
                .join("")}</tr>`,
          )
          .join("");
        popup.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Admin Audit Report</title>
<style>
  body { font: 12px Arial, sans-serif; color: #172033; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  p { color: #526078; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  th { background: #f1f5f9; }
  @media print { body { margin: 12mm; } thead { display: table-header-group; } tr { break-inside: avoid; } }
</style></head><body>
<h1>Admin Audit Report</h1>
<p>Generated ${htmlEscape(new Date().toLocaleString())} · ${auditLogs.length} entries</p>
<table><thead>${tableHeader}</thead><tbody>${tableBody}</tbody></table>
</body></html>`);
        popup.document.close();
        window.setTimeout(() => {
          popup.focus();
          popup.print();
        }, 250);
      }
      setExportError("");
      setExportDialogOpen(false);
    } catch (reportError) {
      setExportError(reportError.message || "Unable to generate the report.");
    }
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
        <Typography variant="h4">Audit trail</Typography>
        <Typography color="text.secondary">
          Review administrative activity and account changes from one place.
        </Typography>
      </Stack>

      {!loading && !error && auditLogs.length === 0 && (
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
        ></Paper>
      )}
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
              width: "100%",
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
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadOutlinedIcon />}
              onClick={() => {
                setExportError("");
                setExportDialogOpen(true);
              }}
              disabled={loading || Boolean(error)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Export report
            </Button>
          </Box>
        </Box>
        {exportError && (
          <Alert
            severity="error"
            onClose={() => setExportError("")}
            sx={{ mx: 2, mb: 1 }}
          >
            {exportError}
          </Alert>
        )}
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
                Audit events will appear here as administrators create, update,
                or remove records.
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 820 }}>
              <TableHead
                sx={{
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "background.table"
                      : "#f8fafc",
                }}
              >
                <TableRow>
                  {reportHeaders.map((heading) => (
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
                    <TableCell sx={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {log.room_id ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatAuditRole(log.role)}
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
                      {formatAuditInformation(log)}
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
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Export audit report</DialogTitle>
        <DialogContent>
          {exportError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {exportError}
            </Alert>
          )}
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Choose a file format for the {auditLogs.length} audit entries
            matching your current filters.
          </Typography>
          <RadioGroup
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value)}
          >
            <FormControlLabel value="csv" control={<Radio />} label="CSV" />
            <FormControlLabel
              value="excel"
              control={<Radio />}
              label="Excel (.xls)"
            />
            <FormControlLabel
              value="pdf"
              control={<Radio />}
              label="PDF (print or save as PDF)"
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={generateReport}>
            Generate report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
