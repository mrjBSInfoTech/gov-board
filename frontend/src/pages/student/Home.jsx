import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";

export default function Dashboard() {
  const navigate = useNavigate();
  const firstName = localStorage.getItem("student_first_name") || "Student";

  const cards = [
    {
      title: "Announcements",
      subtitle: "View updates shared with your room",
      icon: <CampaignOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
      action: () => navigate("/student/announcement"),
      buttonLabel: "Open announcements",
    },
    {
      title: "Room",
      subtitle: "Join a room and connect with your classmates",
      icon: <MeetingRoomOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      action: () => navigate("/student/announcement"),
      buttonLabel: "Open room",
    },
    {
      title: "Account",
      subtitle: "Your student account is ready to use",
      icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 38 }} />,
      color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      action: () => navigate("/student/announcement"),
      buttonLabel: "View account activity",
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Home</title>
      </Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 }, mb: 1 }}
        >
          Welcome back, {firstName}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here’s a quick overview of your student panel.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} md={4} key={card.title}>
            <Card sx={{ height: "100%", borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 3,
                  }}
                >
                  <Typography variant="overline" color="text.secondary">
                    {card.title}
                  </Typography>
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

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
        <Button
          variant="contained"
          onClick={() => navigate("/student/announcement")}
        >
          Open announcements
        </Button>
      </Paper>
    </Box>
  );
}
