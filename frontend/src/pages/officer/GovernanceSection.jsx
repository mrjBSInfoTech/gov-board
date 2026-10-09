import { Helmet } from "react-helmet-async";
import { Navigate, useLocation } from "react-router-dom";
import { Box, Paper, Typography } from "@mui/material";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import { canAccessGovernanceSection } from "../../utils/governanceAccess";

const SECTIONS = {
  audit: {
    title: "Audit",
    description: "Review governance activity and accountability records.",
    icon: HistoryOutlinedIcon,
  },
  budget: {
    title: "Budget",
    description: "Plan and review the organization’s budget.",
    icon: AccountBalanceOutlinedIcon,
  },
  funds: {
    title: "Funds",
    description: "Track available funds and financial movements.",
    icon: AttachMoneyOutlinedIcon,
  },
  "event-handlers": {
    title: "Event Handlers",
    description: "Coordinate event assignments and responsibilities.",
    icon: EventNoteOutlinedIcon,
  },
  moderate: {
    title: "Moderate",
    description: "Review and moderate room activity.",
    icon: GavelOutlinedIcon,
  },
};

export default function GovernanceSection() {
  const { pathname } = useLocation();
  const sectionKey = pathname.split("/").filter(Boolean).pop();
  const section = SECTIONS[sectionKey] || SECTIONS.audit;
  const position = localStorage.getItem("officer_position");

  if (!canAccessGovernanceSection(position, sectionKey)) {
    return <Navigate to="/officer/dashboard" replace />;
  }

  const SectionIcon = section.icon;

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>{section.title}</title>
      </Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 }, mb: 1 }}
        >
          {section.title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {section.description}
        </Typography>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, sm: 5 },
          minHeight: 240,
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <SectionIcon sx={{ fontSize: 52, color: "primary.light", mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {section.title} workspace
        </Typography>
        <Typography color="text.secondary">
          This section is ready for its records and workflows.
        </Typography>
      </Paper>
    </Box>
  );
}
