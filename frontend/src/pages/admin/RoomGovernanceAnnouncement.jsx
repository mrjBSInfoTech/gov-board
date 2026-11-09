import { Box, Paper, Typography } from "@mui/material";
import { Helmet } from "react-helmet-async";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";

export default function RoomGovernanceAnnouncement() {
  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Governance Announcement</title>
      </Helmet>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        Announcement
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Governance announcements workspace.
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          minHeight: 240,
          p: 4,
          display: "grid",
          placeContent: "center",
          justifyItems: "center",
          textAlign: "center",
          borderRadius: 3,
        }}
      >
        <CampaignOutlinedIcon color="action" sx={{ fontSize: 44, mb: 1 }} />
        <Typography color="text.secondary">
          This section is a template for future governance announcements.
        </Typography>
      </Paper>
    </Box>
  );
}
