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
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import { fetchAccounts } from "../../api/admin/accountAPI";
import { fetchRooms } from "../../api/admin/roomAPI";
import { fetchStudents } from "../../api/admin/studentAPI";

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    officials: 0,
    rooms: 0,
    students: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboardSummary = async () => {
      try {
        const [officials, rooms, students] = await Promise.all([
          fetchAccounts(),
          fetchRooms(),
          fetchStudents(),
        ]);

        setSummary({
          officials: Array.isArray(officials) ? officials.length : 0,
          rooms: Array.isArray(rooms) ? rooms.length : 0,
          students: Array.isArray(students) ? students.length : 0,
        });
      } catch (err) {
        console.error("Failed to load dashboard summary:", err);
        setError(err.message || "Unable to load dashboard summary.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardSummary();
  }, []);

  const dashboardCards = [
    {
      title: "Officials",
      value: summary.officials,
      subtitle: "Active officers in the system",
      icon: <PeopleAltOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "#1976d2",
      action: () => navigate("/admin/account/officials"),
      buttonLabel: "Manage officials",
    },
    {
      title: "Rooms",
      value: summary.rooms,
      subtitle: "Assigned rooms for announcements",
      icon: <MeetingRoomOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "#2e7d32",
      action: () => navigate("/admin/room"),
      buttonLabel: "View rooms",
    },
    {
      title: "Students",
      value: summary.students,
      subtitle: "Registered student accounts",
      icon: <SchoolOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "#ed6c02",
      action: () => navigate("/admin/account/students"),
      buttonLabel: "Review students",
    },
  ];

  const quickLinks = [
    { label: "Officials", path: "/admin/account/officials" },
    { label: "Students", path: "/admin/account/students" },
    { label: "Rooms", path: "/admin/room" },
    { label: "Audit Log", path: "/admin/audit" },
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
          Welcome back! Here is a quick overview of your administration data.
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
            {dashboardCards.map((card) => (
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

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <Paper
                variant="outlined"
                sx={{ p: 3, borderRadius: 3, height: "100%" }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Quick actions
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  {quickLinks.map((item) => (
                    <Button
                      key={item.label}
                      variant="contained"
                      onClick={() => navigate(item.path)}
                      sx={{ borderRadius: 2 }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Paper
                variant="outlined"
                sx={{ p: 3, borderRadius: 3, height: "100%" }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  System highlights
                </Typography>

                <Box sx={{ display: "grid", gap: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    • Keep records updated for officials and students.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Add or edit room assignments for community announcements.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Review the audit log to track recent administrative
                    actions.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
