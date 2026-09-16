import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

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

const emptyForm = {
  first_name: "",
  last_name: "",
  student_number: "",
  position: "",
  year: "",
  section: "",
  password: "",
  confirmPassword: "",
  role: "officer",
  can_add: true,
  can_edit: true,
  can_delete: true,
  can_moderate: false,
};

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true"].includes(String(value).toLowerCase());

// Preset permissions per role
const ROLE_PERMISSIONS = {
  officer: {
    can_add: true,
    can_edit: true,
    can_delete: true,
    can_moderate: false,
  },
  moderator: {
    can_add: true,
    can_edit: true,
    can_delete: false,
    can_moderate: true,
  },
  viewer: {
    can_add: false,
    can_edit: false,
    can_delete: false,
    can_moderate: false,
  },
  customize: {
    can_add: false,
    can_edit: false,
    can_delete: false,
    can_moderate: false,
  },
};

function AccountForm({ open, handleClose, selectedAccount, onSubmit }) {
  const isEdit = Boolean(selectedAccount);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData({
      ...emptyForm,
      student_number: selectedAccount?.student_number || "",
      position: selectedAccount?.position || "",
      first_name: selectedAccount?.first_name || "",
      last_name: selectedAccount?.last_name || "",
      year: selectedAccount?.year || "",
      section: selectedAccount?.section || "",
      password: "",
      confirmPassword: "",
      role: selectedAccount?.role || "officer",
      can_add: toBoolean(selectedAccount?.can_add ?? true),
      can_edit: toBoolean(selectedAccount?.can_edit ?? true),
      can_delete: toBoolean(selectedAccount?.can_delete ?? true),
      can_moderate: toBoolean(selectedAccount?.can_moderate ?? false),
    });
    setError("");
    setShowPassword(false);
    setShowConfirm(false);
  }, [open, selectedAccount]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleVerify();
    }

    if (event.key === "Escape") {
      handleClose();
    }
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    // When role changes → apply preset permissions
    if (name === "role") {
      const permissions = ROLE_PERMISSIONS[value] || ROLE_PERMISSIONS.customize;
      setFormData((prev) => ({ ...prev, role: value, ...permissions }));
      setError("");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.student_number.trim()) {
      setError("Student Number is required.");
      return;
    }
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!formData.position.trim()) {
      setError("Position is required.");
      return;
    }
    if (!formData.year.trim() || !formData.section.trim()) {
      setError("Year and section are required.");
      return;
    }
    if (!isEdit && !formData.password.trim()) {
      setError("Password is required when creating an account.");
      return;
    }
    if (formData.password || formData.confirmPassword) {
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        student_number: formData.student_number.trim(),
        position: formData.position.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        year: formData.year.trim(),
        section: formData.section.trim(),
        role: formData.role,
        can_add: formData.can_add,
        can_edit: formData.can_edit,
        can_delete: formData.can_delete,
        can_moderate: formData.can_moderate,
      };
      if (formData.password) payload.password = formData.password.trim();

      await onSubmit(payload);
      handleClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to save officer account.");
    } finally {
      setLoading(false);
    }
  };

  const isCustomize = formData.role === "customize";

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      TransitionComponent={Transition}
      onKeyDown={handleKeyDown}
      keepMounted
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>
        {isEdit ? "Edit Officer Account" : "Create Officer Account"}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Name row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              disabled={loading}
              required
              size="small"
            />
            <TextField
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={loading}
              required
              size="small"
            />
          </Box>

          {/* Student Number */}
          <TextField
            label="Student Number"
            name="student_number"
            value={formData.student_number}
            onChange={handleChange}
            disabled={loading}
            required
            size="small"
          />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="Position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              disabled={loading}
              required
            />
            <TextField
              label="Year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </Box>

          <TextField
            label="Section"
            name="section"
            value={formData.section}
            onChange={handleChange}
            disabled={loading}
            required
            size="small"
          />

          {/* Role */}
          <FormControl fullWidth size="small" disabled={loading}>
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formData.role}
              label="Role"
              onChange={handleChange}
            >
              <MenuItem value="mayor">Mayor</MenuItem>
              <MenuItem value="vice-mayor">Vice Mayor</MenuItem>
              <MenuItem value="secretary">Secretary</MenuItem>
              <MenuItem value="treasurer">Treasurer</MenuItem>
              <MenuItem value="peace-officer">Peace Officer</MenuItem>
            </Select>
          </FormControl>

          {/* Permissions */}
          <Box
            sx={{
              bgcolor: "action.hover",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              p: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Permissions
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="can_add"
                    checked={formData.can_add}
                    onChange={handleChange}
                    disabled={loading}
                    size="small"
                  />
                }
                label="Can Add"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="can_edit"
                    checked={formData.can_edit}
                    onChange={handleChange}
                    disabled={loading}
                    size="small"
                  />
                }
                label="Can Edit"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="can_delete"
                    checked={formData.can_delete}
                    onChange={handleChange}
                    disabled={loading}
                    size="small"
                  />
                }
                label="Can Delete"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="can_moderate"
                    checked={formData.can_moderate}
                    onChange={handleChange}
                    disabled={loading}
                    size="small"
                  />
                }
                label="Can Moderate"
              />
            </Box>
          </Box>

          {/* Password */}
          <TextField
            label={
              isEdit ? "New Password (leave blank to keep current)" : "Password"
            }
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            required={!isEdit}
            size="small"
            helperText={
              isEdit
                ? "Optional — leave blank to keep current password."
                : "Minimum 6 characters."
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((p) => !p)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirm Password"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            required={!isEdit}
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirm((p) => !p)}
                    edge="end"
                    size="small"
                  >
                    {showConfirm ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={loading}
        >
          {isEdit ? "Update Account" : "Create Account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AccountForm;
