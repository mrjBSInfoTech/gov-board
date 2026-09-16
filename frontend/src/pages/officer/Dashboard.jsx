import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    announcements: 0,
    account: 0,
    moderate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const token = localStorage.getItem("officer_token");
        if (!token) {
          setError("Officer session is missing.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/officer/dashboard/summary",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load dashboard summary");
        }

        const data = await response.json();
        setSummary({
          announcements: Number(data.announcements || 0),
          account: Number(data.account || 0),
          moderate: Number(data.moderate || 0),
        });
      } catch (err) {
        console.error("Failed to load officer dashboard summary:", err);
        setError(err.message || "Unable to load dashboard summary.");
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  const cards = [
    {
      title: "Announcements",
      value: summary.announcements,
      subtitle: "Published in your rooms",
      icon: <CampaignOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
      action: () => navigate("/officer/announcement"),
      buttonLabel: "Open announcements",
    },
    {
      title: "Account",
      value: summary.account,
      subtitle: "Officer profile and access",
      icon: <GroupsOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      action: () => navigate("/officer/account"),
      buttonLabel: "Manage account",
    },
    {
      title: "Moderate",
      value: summary.moderate,
      subtitle: "Pending items to review",
      icon: <GavelOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      action: () => navigate("/officer/moderate"),
      buttonLabel: "Review updates",
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Dashboard</title>
      </Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 }, mb: 1 }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back. Here’s a quick snapshot of your officer tools.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {cards.map((card) => (
              <Grid item xs={12} md={4} key={card.title}>
                <Card
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "none",
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 3,
                      }}
                    >
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          {card.title}
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                          {card.value}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          background: card.color,
                        }}
                      >
                        {card.icon}
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {card.subtitle}
                    </Typography>

                    <Button
                      variant="text"
                      endIcon={<ArrowForwardOutlinedIcon />}
                      onClick={card.action}
                      sx={{ p: 0, minWidth: 0, fontWeight: 600 }}
                    >
                      {card.buttonLabel}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Quick actions
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              <Button
                variant="contained"
                onClick={() => navigate("/officer/announcement")}
              >
                Announcements
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate("/officer/account")}
              >
                Account
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate("/officer/moderate")}
              >
                Moderate
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
