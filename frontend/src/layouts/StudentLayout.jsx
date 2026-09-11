import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Backdrop,
  Slide,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Logout from "@mui/icons-material/Logout";
import logo from "../assets/react.svg";
import { logoutUser } from "../api/student/studentAuthenticationAPI";
import { hasValidToken, clearAuthData } from "../../utils/auth";

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

function StudentLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Student Info
  const [studentNumber, setStudentNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [loggedIn, setLoggedIn] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const handleOpenDialog = () => {
    handleClose();
    setOpenDialog(true);
  };
  const handleCloseDialog = () => setOpenDialog(false);

  useEffect(() => {
    const loadStudentProfile = () => {
      const token = localStorage.getItem("student_token");
      const isValid = Boolean(token && hasValidToken(token));
      setLoggedIn(isValid);

      const storedStudentNumber = localStorage.getItem("student_student_number");
      const storedFirstName = localStorage.getItem("student_first_name");
      const storedMiddleName = localStorage.getItem("student_middle_name");
      const storedLastName = localStorage.getItem("student_last_name");
      const storedEmail = localStorage.getItem("student_email");
      const storedPhoneNumber = localStorage.getItem("student_phone_number");

      setStudentNumber(storedStudentNumber || "");
      setFirstName(storedFirstName || "");
      setMiddleName(storedMiddleName || "");
      setLastName(storedLastName || "");
      setEmail(storedEmail || "");
      setPhoneNumber(storedPhoneNumber || "");
    };

    loadStudentProfile();
    window.addEventListener("storage", loadStudentProfile);

    return () => {
      window.removeEventListener("storage", loadStudentProfile);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    if (logoutUser) {
      logoutUser();
    }
    clearAuthData("student");
    setLoggedIn(false);
    handleCloseDialog();
    navigate("/student/login", { replace: true });

    // Clear browser history for extra security
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
      window.history.pushState(null, null, window.location.href);
    };
  };

  const open = Boolean(anchorEl);

  // Open account popover
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Close account popover
  const handleClose = () => {
    setAnchorEl(null);
  };

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || "Student";

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: "#374151",
          padding: { xs: "4px 10px", lg: "8px 20px" },
        }}
        elevation={0}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: { xs: 42, sm: 50 },
                height: { xs: 42, sm: 50 },
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onClick={() => {
                navigate("/student/home");
              }}
            >
              <img
                src={logo}
                alt="logo"
                style={{
                  width: "70%",
                  height: "70%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "#fff",
              }}
            >
              GovBoard
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <IconButton
              sx={{ color: "white" }}
              onClick={(e) => {
                if (loggedIn) {
                  handleClick(e);
                } else {
                  navigate("/student/login");
                }
              }}
            >
              <AccountCircleIcon fontSize="large" />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: {
                    overflow: "visible",
                    filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                    mt: 1.5,
                    "& .MuiAvatar-root": {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                    "&::before": {
                      content: '""',
                      display: "block",
                      position: "absolute",
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: "background.paper",
                      transform: "translateY(-50%) rotate(45deg)",
                      zIndex: 0,
                    },
                  },
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem disabled sx={{ opacity: "1 !important" }}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {displayName}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleOpenDialog}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>

          <Dialog
            open={openDialog}
            onClose={handleCloseDialog}
            TransitionComponent={Transition}
            keepMounted
            slots={{ backdrop: Backdrop }}
            slotProps={{
              backdrop: {
                timeout: 500,
              },
            }}
          >
            <DialogTitle>Log out</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to log out?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                variant="contained"
                color="primary"
              >
                Logout
              </Button>
            </DialogActions>
          </Dialog>
        </Toolbar>
      </AppBar>
      {children || <Outlet />}
    </>
  );
}

export default StudentLayout;
