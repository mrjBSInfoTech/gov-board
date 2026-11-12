import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { fetchGovernanceReport } from "../../api/officer/governanceReportAPI";

export default function GovernanceReports({ roomId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const downloadReport = async () => {
    if (!roomId || loading) return;
    setLoading(true);
    setError("");
    try {
      const report = await fetchGovernanceReport(roomId, "all");
      const url = URL.createObjectURL(report);
      const link = document.createElement("a");
      link.href = url;
      link.download = `governance-report-room-${roomId}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (reportError) {
      setError(reportError.message || "Unable to generate the governance report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2} sx={{ maxWidth: 760 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Governance reports
          </Typography>
          <Typography color="text.secondary">
            Download one room-scoped CSV with all Governance sections, or download
            a section-specific report from its page.
          </Typography>
        </Box>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <DownloadOutlinedIcon />}
            onClick={downloadReport}
            disabled={loading || !roomId}
            sx={{ minHeight: 44, textTransform: "none", fontWeight: 800 }}
          >
            {loading ? "Generating report..." : "Download room report"}
          </Button>
        </Paper>
      </Stack>
    </Box>
  );
}
