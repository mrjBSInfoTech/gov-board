import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Snackbar,
  Select,
  Slide,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { loginUser } from "../../api/officer/officerAuthenticationAPI";
import Icon from "../../assets/react.svg";
import { hasValidToken, setToken } from "../../../utils/auth";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const Login = () => {
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [module, setModule] = useState("Officer");
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const officerToken = localStorage.getItem("officer_token");
    if (officerToken && hasValidToken(officerToken)) {
      navigate("/officer/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleLogin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [studentNumber, password]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  const handleModuleChange = (event) => {
    const selectedModule = event.target.value;
    setModule(selectedModule);

    if (selectedModule === "Officer") {
      navigate("/officer/login");
    } else if (selectedModule === "Admin") {
      navigate("/admin/login");
    } else if (selectedModule === "Student") {
      navigate("/student/login");
    }
  };

  const handleLogin = async () => {
    if (!studentNumber || !password) {
      showSnackbar("Please fill in all fields", "error");
      return;
    }

    try {
      const data = await loginUser({ student_number: studentNumber, password });

      setToken("officer", data.token);

      localStorage.setItem("officer_officer_id", data.officer_id || "");
      localStorage.setItem("officer_student_number", data.student_number || "");
      localStorage.setItem("officer_position", data.position || "Officer");
      localStorage.setItem("officer_section", data.section || "");
      localStorage.setItem("officer_first_name", data.first_name || "");
      localStorage.setItem("officer_last_name", data.last_name || "");
      localStorage.setItem("officer_role", data.role || "");
      localStorage.setItem("officer_can_add", data.can_add ? "1" : "0");
      localStorage.setItem("officer_can_edit", data.can_edit ? "1" : "0");
      localStorage.setItem("officer_can_delete", data.can_delete ? "1" : "0");
      localStorage.setItem(
        "officer_can_moderate",
        data.can_moderate ? "1" : "0",
      );

      showSnackbar("Login successful!", "success");
      setTimeout(() => navigate("/officer/dashboard", { replace: true }), 1000);
    } catch (error) {
      showSnackbar(`Login failed: ${error.message}`, "error");
    }
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
        background: "#374151",
        overflowY: "auto",
      }}
    >
      <Helmet titleTemplate="%s - GovBoard">
        <title>Login</title>
      </Helmet>

      <Paper
        elevation={24}
        sx={{
          backgroundColor: "white",
          padding: isMobile ? "25px 20px" : "40px 35px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "450px",
          boxShadow: "0px 15px 40px rgba(0, 0, 0, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Box
            component="img"
            src={Icon}
            alt="ArtMatch"
            sx={{ height: 50, width: "auto" }}
          />
        </Box>

        <Typography
          variant="h6"
          align="center"
          gutterBottom
          sx={{
            fontWeight: "600",
            color: "#333",
            mb: 3,
            fontSize: { xs: "1.2rem", sm: "1.4rem" },
          }}
        >
          Log In
        </Typography>

        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: "600",
                color: "#444",
                mb: 0.75,
                ml: 0.5,
                fontSize: "0.95rem",
              }}
            >
              Module
            </Typography>
            <Select
              fullWidth
              variant="outlined"
              name="course"
              size="small"
              value={module}
              onChange={handleModuleChange}
              sx={{
                borderRadius: "10px",
                backgroundColor: "#f8f9fa",
                fontSize: "0.95rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e0e0e0",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#374151",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#374151",
                  borderWidth: "2px",
                },
              }}
            >
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Officer">Officer</MenuItem>
              <MenuItem value="Student">Student</MenuItem>
            </Select>
          </Box>

          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: "600",
                color: "#444",
                mb: 0.75,
                ml: 0.5,
                fontSize: "0.95rem",
              }}
            >
              Student Number
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Enter your student number"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon
                      sx={{ color: "#374151", fontSize: "1.25rem" }}
                    />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "10px",
                  backgroundColor: "#f8f9fa",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#374151",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#374151",
                    borderWidth: "2px",
                  },
                  fontSize: "0.95rem",
                },
              }}
            />
          </Box>

          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: "600",
                color: "#444",
                mb: 0.75,
                ml: 0.5,
                fontSize: "0.95rem",
              }}
            >
              Password
            </Typography>
            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              variant="outlined"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "#374151", fontSize: "1.25rem" }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "10px",
                  backgroundColor: "#f8f9fa",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#374151",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#374151",
                    borderWidth: "2px",
                  },
                  fontSize: "0.95rem",
                },
              }}
            />
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            sx={{
              height: "48px",
              fontWeight: "700",
              textTransform: "none",
              fontSize: "16px",
              backgroundColor: "#374151",
              borderRadius: "10px",
              mt: 1.5,
              "&:hover": {
                backgroundColor: "#1f2937",
                transform: "translateY(-1px)",
                boxShadow: "0px 8px 15px rgba(55, 65, 81, 0.2)",
              },
              transition: "all 0.2s ease",
              boxShadow: "0px 4px 10px rgba(55, 65, 81, 0.15)",
            }}
          >
            Login
          </Button>
        </Stack>
      </Paper>
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": {
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Login;
