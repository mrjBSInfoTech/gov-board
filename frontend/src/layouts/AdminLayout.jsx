import * as React from "react";
import { useState, useEffect } from "react";
import { AppProvider } from "@toolpad/core";
import Backdrop from "@mui/material/Backdrop";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import {
  DashboardLayout as MuiDashboardLayout,
  DashboardSidebarPageItem,
} from "@toolpad/core";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Slide from "@mui/material/Slide";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Stack, Avatar, Typography, IconButton } from "@mui/material";
import { ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material";
import { adminLightTheme, adminDarkTheme } from "../theme/customTheme";
import Nexus from "../assets/react.svg";
import { clearAuthData } from "../../utils/auth";

// Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import GroupsIcon from "@mui/icons-material/Groups";
import SchoolIcon from "@mui/icons-material/School";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import HistoryIcon from "@mui/icons-material/History";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

function AccountsNavigationItem({ item }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (location.pathname.startsWith("/admin/account")) {
      setExpanded(true);
    }
  }, [location.pathname]);

  return (
    <DashboardSidebarPageItem
      item={item}
      expanded={expanded}
      onClick={() => setExpanded((current) => !current)}
    />
  );
}

export default function AdminLayout() {
  // Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  useEffect(() => {
    const loadAdminProfile = () => {
      const storedFirstName = localStorage.getItem("admin_first_name");
      const storedLastName = localStorage.getItem("admin_last_name");

      setFirstName(storedFirstName || "");
      setLastName(storedLastName || "");
    };

    loadAdminProfile();
    window.addEventListener("storage", loadAdminProfile);

    return () => {
      window.removeEventListener("storage", loadAdminProfile);
    };
  }, []);

  // Simulated router (for Toolpad)
  const router = {
    pathname: location.pathname.replace(/^\/admin/, "") || "/",
    navigate: (path) => {
      navigate(`/admin/${path.replace(/^\/+/, "")}`);
    },
  };

  const handleLogout = async () => {
    setOpen(false);
    clearAuthData("admin");

    setTimeout(() => {
      navigate("/admin/login", { replace: true });

      // Clear browser history for extra security
      window.history.pushState(null, null, window.location.href);
      window.onpopstate = function () {
        window.history.pushState(null, null, window.location.href);
      };
    }, 150);
  };

  // Sidebar menu items based on pages/admin
  const navigation = [
    {
      segment: "dashboard",
      title: "Dashboard",
      icon: <DashboardIcon />,
    },
    {
      segment: "account",
      title: "Accounts",
      icon: <AccountCircleIcon />,
      children: [
        {
          segment: "officials",
          title: "Officials",
          icon: <GroupsIcon />,
        },
        {
          segment: "students",
          title: "Students",
          icon: <SchoolIcon />,
        },
      ],
    },
    {
      segment: "room",
      title: "Room",
      icon: <MeetingRoomIcon />,
    },
    {
      segment: "audit",
      title: "Audit",
      icon: <HistoryIcon />,
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
          boxShadow: "0 5px 16px rgba(45, 212, 191, 0.14)",
        }}
      >
        <img src={Nexus} alt="logo" style={{ width: 30, height: 30 }} />
      </Box>
    ),
    title: (
      <Typography
        sx={{
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: 23,
          letterSpacing: "-0.02em",
        }}
      >
        GovBoard
      </Typography>
    ),
    homeUrl: "/admin/dashboard",
  };

  const SidebarFooter = ({ mini }) => (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={mini ? "center" : "space-between"}
      spacing={mini ? 0 : 1.5}
      sx={{
        p: 1.75,
        borderTop: "1px solid",
        borderColor: "rgba(148, 163, 184, 0.2)",
        backgroundColor: "rgba(13, 23, 31, 0.45)",
        color: theme.palette.text.sidebar,
        mt: "auto",
        boxShadow: "0 -10px 24px rgba(3, 10, 15, 0.12)",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src="http://localhost:5000/uploads/profile.jpg"
          sx={{
            width: 42,
            height: 42,
            border: "2px solid rgba(94, 234, 212, 0.7)",
            backgroundColor: "#344452",
          }}
        />
        {!mini && (
          <Stack direction="column">
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 15 }}>
              {firstName} {lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: "#a9b9bf" }}>
              Administrator
            </Typography>
          </Stack>
        )}
      </Stack>

      {!mini && (
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={{
            color: "#a9b9bf",
            border: "1px solid rgba(148, 163, 184, 0.24)",
            borderRadius: 1.5,
            "&:hover": {
              color: "#ffffff",
              backgroundColor: "rgba(45, 212, 191, 0.14)",
              borderColor: "rgba(94, 234, 212, 0.5)",
            },
          }}
        >
          <ExitToAppIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );

  // Custom header with logout button on the right
  const CustomHeader = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "100%",
        px: { xs: 1, sm: 2.5 },
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: theme.palette.primary.light,
          boxShadow: `0 0 0 4px ${theme.palette.primary.light}22`,
        }}
      />
      <Typography
        variant="caption"
        sx={{
          color: "rgba(238, 244, 245, 0.78)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Admin console
      </Typography>
    </Box>
  );

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = prefersDarkMode ? adminDarkTheme : adminLightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider
        navigation={navigation}
        branding={branding}
        router={router}
        session={{
          user: {
            name: `${firstName} ${lastName}`.trim(),
          },
        }}
        theme={theme}
        disableCollapsibleSidebar={true}
      >
        <Dialog
          open={open}
          onClose={handleClose}
          TransitionComponent={Transition}
          keepMounted
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: "bold" }}>Log out</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to log out?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleLogout} variant="contained" color="primary">
              Logout
            </Button>
          </DialogActions>
        </Dialog>
        <MuiDashboardLayout
          slots={{
            toolbarAccount: CustomHeader,
            sidebarFooter: SidebarFooter,
          }}
          renderPageItem={(item) =>
            item.segment === "account" ? (
              <AccountsNavigationItem item={item} />
            ) : (
              <DashboardSidebarPageItem item={item} />
            )
          }
          sx={{
            backgroundColor: theme.palette.background.default,
            "& .MuiDrawer-paper": {
              backgroundColor: theme.palette.background.sidebar,
              color: theme.palette.text.sidebar,
              borderRight: "1px solid rgba(148, 163, 184, 0.13)",
              borderTop: `3px solid ${theme.palette.primary.light}`,
              boxShadow: "8px 0 30px rgba(3, 10, 15, 0.18)",
            },
            "& .MuiAppBar-root .MuiIconButton-root": {
              color: "#ffffff",
            },
            "& .MuiAppBar-root .MuiSvgIcon-root": {
              color: "#ffffff",
            },
            "& .MuiDrawer-paper .MuiPaper-root": {
              backgroundColor: theme.palette.background.sidebar,
            },
            // Selected text
            "& .MuiDrawer-paper .Mui-selected .MuiListItemText-primary": {
              color: "#ffffff",
              fontWeight: 700,
            },
            // Selected icon
            "& .MuiDrawer-paper .Mui-selected .MuiSvgIcon-root": {
              color: "#ffffff",
            },
            "& .MuiDrawer-paper .Mui-selected .MuiTypography-caption": {
              color: "#ffffff",
            },
            // Sidebar text color
            "& .MuiDrawer-paper .MuiListItemText-primary": {
              color: "#e5e7eb",
              fontSize: "0.9rem",
              fontWeight: 600,
            },
            // Sidebar icons color
            "& .MuiDrawer-paper .MuiSvgIcon-root": {
              color: "#9ca3af",
            },
            "& .MuiListItemButton-root:hover": {
              backgroundColor: "rgba(45, 212, 191, 0.12)",
            },
            "& .Mui-selected": {
              backgroundColor: "rgba(45, 212, 191, 0.18) !important",
              borderLeft: "3px solid #2dd4bf",
            },
            // Header
            "& .MuiAppBar-root": {
              backgroundColor: theme.palette.background.header,
              borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
              boxShadow: "0 8px 24px rgba(3, 10, 15, 0.16)",
              zIndex: 1201,
            },

            "& .MuiListItemButton-root": {
              marginTop: "3px",
              marginBottom: "3px",
              minHeight: 46,
              borderRadius: "0 8px 8px 0",
              transition:
                "background-color 160ms ease, border-color 160ms ease, transform 160ms ease",
              "&:hover": { transform: "translateX(2px)" },
            },
            "& .MuiListItemIcon-root": { minWidth: 42 },
            "& .MuiToolbar-root": { minHeight: 72 },
          }}
        >
          <div style={{ padding: "0 0 20px" }}>
            <Outlet />
          </div>
        </MuiDashboardLayout>
      </AppProvider>
    </ThemeProvider>
  );
}
