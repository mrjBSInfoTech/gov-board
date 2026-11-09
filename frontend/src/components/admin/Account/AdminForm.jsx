import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";

const emptyForm = {
  username: "",
  first_name: "",
  last_name: "",
  position: "Governor",
  college: "",
  password: "",
  can_edit_students: false,
};

export default function AdminForm({
  open,
  onClose,
  selectedAdmin,
  onSubmit,
}) {
  const isEditing = Boolean(selectedAdmin);
  const isPrimaryAdmin = Number(selectedAdmin?.admin_id) === 1;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      selectedAdmin
        ? {
            username: selectedAdmin.username || "",
            first_name: selectedAdmin.first_name || "",
            last_name: selectedAdmin.last_name || "",
            position: selectedAdmin.position || "Governor",
            college: selectedAdmin.college || "",
            password: "",
            can_edit_students: Boolean(selectedAdmin.can_edit_students),
          }
        : emptyForm,
    );
    setError("");
  }, [open, selectedAdmin]);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (
      !form.username.trim() ||
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      (!isPrimaryAdmin && !form.college.trim()) ||
      (!isEditing && form.password.length < 8) ||
      (form.password && form.password.length < 8)
    ) {
      setError(
        !isEditing && form.password.length < 8
          ? "Password must be at least 8 characters."
          : "Please complete all required fields.",
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        position: isPrimaryAdmin ? "Super Admin" : form.position,
        college: isPrimaryAdmin ? "" : form.college.trim(),
        can_edit_students: form.can_edit_students,
        password: form.password,
      };
      await onSubmit(payload);
    } catch (submitError) {
      setError(submitError.message || "Unable to save admin account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEditing ? "Edit Admin Account" : "Create Admin Account"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              disabled={saving}
              required
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="First name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                disabled={saving}
                required
              />
              <TextField
                fullWidth
                label="Last name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                disabled={saving}
                required
              />
            </Stack>
            {!isPrimaryAdmin && (
              <>
                <FormControl fullWidth>
                  <InputLabel id="admin-position-label">Position</InputLabel>
                  <Select
                    labelId="admin-position-label"
                    name="position"
                    value={form.position}
                    label="Position"
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <MenuItem value="Governor">Governor</MenuItem>
                    <MenuItem value="College Head">College Head</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="College"
                  name="college"
                  value={form.college}
                  onChange={handleChange}
                  disabled={saving}
                  required
                />
                {form.position === "Governor" && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="can_edit_students"
                        checked={form.can_edit_students}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    }
                    label="Allow this Governor to edit student details"
                  />
                )}
              </>
            )}
            <TextField
              label={isEditing ? "New password (optional)" : "Password"}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              disabled={saving}
              required={!isEditing}
              helperText={
                isEditing
                  ? "Leave blank to keep the current password."
                  : "At least 8 characters."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
