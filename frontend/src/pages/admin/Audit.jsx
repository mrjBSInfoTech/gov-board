import HistoryIcon from "@mui/icons-material/History";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { Helmet } from "react-helmet-async";

export default function Audit() {
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
            Audit events will appear here as administrators create, update, or
            remove records.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
