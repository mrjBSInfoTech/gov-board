import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate, useParams } from "react-router-dom";
import { Alert, Box, CircularProgress, Paper, Typography } from "@mui/material";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import { canAccessGovernanceSection } from "../../utils/governanceAccess";
import Calendar from "./Calendar";
import Fund from "./Fund";
import Audit from "./Audit";
import Budget from "./Budget";
import Moderate from "./Moderate";
import { fetchMyRoom } from "../../api/roomAPI";

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
    title: "Event Scheduler",
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
  const { roomId, section: sectionKey } = useParams();
  const section = SECTIONS[sectionKey] || SECTIONS.audit;
  const [membership, setMembership] = useState(null);
  const [verifiedRoomId, setVerifiedRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMembership(null);
    setError("");
    fetchMyRoom(Number(roomId))
      .then((room) => {
        if (active) {
          setMembership(room);
          setVerifiedRoomId(roomId);
        }
      })
      .catch((loadError) => {
        if (active) {
          setVerifiedRoomId(roomId);
          setError(loadError.message || "Unable to verify room access.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomId]);

  if (loading || verifiedRoomId !== roomId) {
    return <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  }
  if (!membership || membership.member_type !== "officer") {
    return <Navigate to="/officer/rooms/main" replace />;
  }
  if (!SECTIONS[sectionKey] || !canAccessGovernanceSection(membership.position, sectionKey)) {
    return <Navigate to={`/officer/rooms/${roomId}/hub`} replace />;
  }

  if (sectionKey === "event-handlers") {
    return <Calendar key={roomId} roomId={Number(roomId)} />;
  }
  if (sectionKey === "budget") {
    return <Budget key={roomId} roomId={Number(roomId)} />;
  }
  if (sectionKey === "audit") {
    return <Audit key={roomId} roomId={Number(roomId)} />;
  }
  if (sectionKey === "funds") {
    return <Fund key={roomId} roomId={Number(roomId)} />;
  }
  if (sectionKey === "moderate") {
    return <Moderate key={roomId} roomId={Number(roomId)} position={membership.position} />;
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
