import { useState } from "react";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { fetchGovernanceReport } from "../../api/officer/governanceReportAPI";

const sectionLabels = {
  audit: "audit",
  budget: "budget",
  funds: "funds",
  "event-handlers": "events",
  announcement: "announcements",
  moderate: "moderation",
};

export default function GovernanceReportDownload({ roomId, section }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const downloadReport = async () => {
    if (!roomId || loading || !sectionLabels[section]) return;
    setLoading(true);
    setError("");
    try {
      const report = await fetchGovernanceReport(roomId, section);
      const url = URL.createObjectURL(report);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sectionLabels[section]}-report-room-${roomId}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reportError) {
      setError(reportError.message || "Unable to generate the report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", px: 3, pt: 2 }}>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={18} /> : <DownloadOutlinedIcon />}
        onClick={downloadReport}
        disabled={loading || !roomId}
        sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }}
      >
        {loading ? "Generating report..." : "Download page report"}
      </Button>
    </Box>
  );
}
