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
  Paper,
  Snackbar,
  Slide,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Badge as BadgeIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import Icon from "../../assets/react.svg";
import { registerUser } from "../../api/student/studentAuthenticationAPI";
import { hasValidToken } from "../../../utils/auth";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Register() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    student_number: "",
    position: "",
    year: "",
    section: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const studentToken = localStorage.getItem("student_token");
    if (studentToken && hasValidToken(studentToken)) {
      navigate("/student/home", { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.first_name ||
      !form.last_name ||
      !form.student_number ||
      !form.position ||
      !form.year ||
      !form.section ||
      !form.password ||
      !form.confirmPassword
    ) {
      showSnackbar("Please fill in all fields.", "error");
      return;
    }

    if (form.password !== form.confirmPassword) {
      showSnackbar("Passwords do not match.", "error");
      return;
    }

    if (form.password.length < 6) {
      showSnackbar("Password must be at least 6 characters.", "error");
      return;
    }

    try {
      setLoading(true);
      await registerUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        student_number: form.student_number.trim(),
        position: form.position.trim(),
        year: form.year.trim(),
        section: form.section.trim(),
        password: form.password,
      });

      showSnackbar(
        "Account created successfully! Redirecting to login...",
        "success",
      );
      setTimeout(() => navigate("/student/login", { replace: true }), 1500);
    } catch (error) {
      showSnackbar(error.message || "Registration failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
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
        <title>Student Register</title>
      </Helmet>

      <Paper
        elevation={24}
        sx={{
          backgroundColor: "white",
          padding: isMobile ? "25px 20px" : "40px 35px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "460px",
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
          Student Register
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {/* First Name & Last Name in one row */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
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
                  First Name
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="First name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  size="small"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon
                          sx={{ color: "#374151", fontSize: "1.25rem" }}
                        />
                      </InputAdornment>
                    ),
                    sx: inputStyle,
                  }}
                />
              </Box>

              <Box sx={{ flex: 1 }}>
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
                  Last Name
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Last name"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  size="small"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon
                          sx={{ color: "#374151", fontSize: "1.25rem" }}
                        />
                      </InputAdornment>
                    ),
                    sx: inputStyle,
                  }}
                />
              </Box>
            </Stack>

            {/* Student Number */}
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
                placeholder="Enter student number"
                name="student_number"
                value={form.student_number}
                onChange={handleChange}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon
                        sx={{ color: "#374151", fontSize: "1.25rem" }}
                      />
                    </InputAdornment>
                  ),
                  sx: inputStyle,
                }}
              />
            </Box>

            {/* Academic details */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Year"
                placeholder="e.g. 1"
                name="year"
                value={form.year}
                onChange={handleChange}
                size="small"
                required
                InputProps={{ sx: inputStyle }}
              />
              <TextField
                fullWidth
                label="Section"
                placeholder="e.g. A"
                name="section"
                value={form.section}
                onChange={handleChange}
                size="small"
                required
                InputProps={{ sx: inputStyle }}
              />
            </Stack>

            {/* Password */}
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
                name="password"
                value={form.password}
                onChange={handleChange}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon
                        sx={{ color: "#374151", fontSize: "1.25rem" }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? (
                          <VisibilityOff sx={{ fontSize: "1.2rem" }} />
                        ) : (
                          <Visibility sx={{ fontSize: "1.2rem" }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: inputStyle,
                }}
              />
            </Box>

            {/* Confirm Password */}
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
                Confirm Password
              </Typography>
              <TextField
                fullWidth
                type={showConfirmPassword ? "text" : "password"}
                variant="outlined"
                placeholder="Confirm your password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon
                        sx={{ color: "#374151", fontSize: "1.25rem" }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff sx={{ fontSize: "1.2rem" }} />
                        ) : (
                          <Visibility sx={{ fontSize: "1.2rem" }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: inputStyle,
                }}
              />
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
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
              {loading ? "Registering..." : "Register"}
            </Button>

            <Divider />

            <Typography variant="body2" align="center">
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/student/login"
                underline="hover"
                sx={{ fontWeight: 700, color: "#374151" }}
              >
                Sign in
              </Link>
            </Typography>
          </Stack>
        </Box>
      </Paper>

      <Snackbar
        open={snackbarOpen}
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
}
