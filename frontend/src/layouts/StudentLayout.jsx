import * as React from "react";
import { useEffect, useState } from "react";
import { AppProvider } from "@toolpad/core";
import { DashboardLayout as MuiDashboardLayout } from "@toolpad/core";
import {
  Backdrop,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Slide,
  Stack,
  ThemeProvider,
  Typography,
  Avatar,
  CssBaseline,
} from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CampaignIcon from "@mui/icons-material/Campaign";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { adminDarkTheme } from "../theme/customTheme";
import Nexus from "../assets/react.svg";
import { logoutUser } from "../api/student/studentAuthenticationAPI";
import { clearAuthData } from "../../utils/auth";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function StudentLayout() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadStudentProfile = () => {
      setFirstName(localStorage.getItem("student_first_name") || "");
      setLastName(localStorage.getItem("student_last_name") || "");
    };

    loadStudentProfile();
    window.addEventListener("storage", loadStudentProfile);
    return () => window.removeEventListener("storage", loadStudentProfile);
  }, []);

  useEffect(() => {
    const loadRoomName = () => {
      const studentId = localStorage.getItem("student_student_id");
      const savedRoom = studentId
        ? localStorage.getItem(`studentJoinedRoom:${studentId}`)
        : null;
      try {
        setRoomName(savedRoom ? JSON.parse(savedRoom).room_name || "" : "");
      } catch (error) {
        console.error("Unable to read saved student room:", error);
        setRoomName("");
      }
    };

    loadRoomName();
    window.addEventListener("room-membership-updated", loadRoomName);
    window.addEventListener("storage", loadRoomName);
    return () => {
      window.removeEventListener("room-membership-updated", loadRoomName);
      window.removeEventListener("storage", loadRoomName);
    };
  }, []);

  const handleLogout = () => {
    logoutUser();
    clearAuthData("student");
    setOpen(false);
    navigate("/student/login", { replace: true });
  };

  const router = {
    pathname: location.pathname.replace(/^\/student/, "") || "/",
    navigate: (path) => {
      navigate(`/student/${path.replace(/^\/+/, "")}`);
    },
  };

  const navigation = [
    { segment: "home", title: "Dashboard", icon: <DashboardIcon /> },
    { segment: "account", title: "Account", icon: <AccountCircleIcon /> },
    {
      segment: "announcement",
      title: roomName || "Room",
      icon: <MeetingRoomIcon />,
    },
  ];

  const branding = {
    logo: (
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2.5,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(45, 212, 191, 0.14)",
          border: "1px solid rgba(94, 234, 212, 0.35)",
        }}
      >
        <img src={Nexus} alt="logo" style={{ width: 30, height: 30 }} />
      </Box>
    ),
    title: (
      <Typography sx={{ color: "#fff", fontWeight: "bold", fontSize: 23 }}>
        GovBoard
      </Typography>
    ),
    homeUrl: "/student/home",
  };

  const SidebarFooter = ({ mini }) => (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={mini ? "center" : "space-between"}
      spacing={mini ? 0 : 1.5}
      sx={{
        p: 1.75,
        borderTop: "1px solid rgba(148, 163, 184, 0.2)",
        backgroundColor: "rgba(13, 23, 31, 0.45)",
        mt: "auto",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          sx={{
            width: 42,
            height: 42,
            border: "2px solid rgba(94, 234, 212, 0.7)",
            backgroundColor: "#344452",
          }}
        >
          {`${firstName[0] || ""}${lastName[0] || ""}`}
        </Avatar>
        {!mini && (
          <Stack>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {`${firstName} ${lastName}`.trim() || "Student"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#a9b9bf" }}>
              Student
            </Typography>
          </Stack>
        )}
      </Stack>

      {!mini && (
        <IconButton
          size="small"
          onClick={() => setOpen(true)}
          aria-label="Log out"
          sx={{
            color: "#a9b9bf",
            border: "1px solid rgba(148, 163, 184, 0.24)",
            borderRadius: 1.5,
          }}
        >
          <ExitToAppIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );

  return (
    <ThemeProvider theme={adminDarkTheme}>
      <CssBaseline />
      <AppProvider
        navigation={navigation}
        router={router}
        branding={branding}
        session={{
          user: {
            name: `${firstName} ${lastName}`.trim() || "Student",
            role: "Student",
          },
        }}
        theme={adminDarkTheme}
        disableCollapsibleSidebar
      >
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          TransitionComponent={Transition}
          keepMounted
          slots={{ backdrop: Backdrop }}
        >
          <DialogTitle sx={{ fontWeight: "bold" }}>Log out</DialogTitle>
          <DialogContent>
            <DialogContentText>Are you sure you want to log out?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleLogout} variant="contained" color="primary">
              Logout
            </Button>
          </DialogActions>
        </Dialog>

        <MuiDashboardLayout
          slots={{ sidebarFooter: SidebarFooter }}
          sx={{
            backgroundColor: adminDarkTheme.palette.background.default,
            "& .MuiDrawer-paper": {
              backgroundColor: adminDarkTheme.palette.background.sidebar,
              color: adminDarkTheme.palette.text.sidebar,
              borderRight: "1px solid rgba(148, 163, 184, 0.13)",
              borderTop: `3px solid ${adminDarkTheme.palette.primary.light}`,
              boxShadow: "8px 0 30px rgba(3, 10, 15, 0.18)",
            },
            "& .MuiAppBar-root": {
              backgroundColor: adminDarkTheme.palette.background.header,
              borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
              boxShadow: "0 8px 24px rgba(3, 10, 15, 0.16)",
            },
            "& .MuiDrawer-paper .MuiListItemText-primary": {
              color: "#e5e7eb",
              fontSize: "0.9rem",
              fontWeight: 600,
            },
            "& .MuiDrawer-paper .MuiSvgIcon-root": { color: "#9ca3af" },
            "& .MuiDrawer-paper .Mui-selected .MuiListItemText-primary": {
              color: "#fff",
              fontWeight: 700,
            },
            "& .MuiDrawer-paper .Mui-selected .MuiSvgIcon-root": {
              color: "#fff",
            },
            "& .MuiListItemButton-root:hover": {
              backgroundColor: "rgba(45, 212, 191, 0.12)",
            },
            "& .Mui-selected": {
              backgroundColor: "rgba(45, 212, 191, 0.18) !important",
              borderLeft: "3px solid #2dd4bf",
            },
            "& .MuiListItemButton-root": {
              marginTop: "3px",
              marginBottom: "3px",
              minHeight: 46,
              borderRadius: "0 8px 8px 0",
            },
            "& .MuiToolbar-root": { minHeight: 72 },
          }}
        >
          <Box sx={{ pb: 2.5 }}>
            <Outlet />
          </Box>
        </MuiDashboardLayout>
      </AppProvider>
    </ThemeProvider>
  );
}
