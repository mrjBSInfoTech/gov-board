import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

const emptyForm = {
  first_name: "",
  last_name: "",
  student_number: "",
  year: "",
  section: "",
  password: "",
  confirmPassword: "",
};

const toText = (value) => (value == null ? "" : String(value));

export default function StudentForm({
  open,
  handleClose,
  selectedStudent,
  onSubmit,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData(
      selectedStudent
        ? {
            first_name: toText(selectedStudent.first_name),
            last_name: toText(selectedStudent.last_name),
            student_number: toText(selectedStudent.student_number),
            year: toText(selectedStudent.year),
            section: toText(selectedStudent.section),
            password: "",
            confirmPassword: "",
          }
        : emptyForm,
    );
    setError("");
  }, [open, selectedStudent]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, value.trim()]),
    );

    if (
      !values.first_name ||
      !values.last_name ||
      !values.student_number ||
      !values.year ||
      !values.section
    ) {
      setError("Please fill all the required fields.");
      return;
    }
    if (values.password || values.confirmPassword) {
      if (values.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (values.password !== values.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { ...values };
      delete payload.confirmPassword;
      await onSubmit(payload);
    } catch (submitError) {
      setError(
        submitError.response?.data?.message ||
          submitError.message ||
          "Unable to update student account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : handleClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Student Account</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </Stack>
            <TextField
              label="Student Number"
              name="student_number"
              value={formData.student_number}
              onChange={handleChange}
              disabled={loading}
              required
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                disabled={loading}
                required
              />
              <TextField
                fullWidth
                label="Section"
                name="section"
                value={formData.section}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </Stack>
            <TextField
              label="New Password (optional)"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              helperText="Leave blank to keep the current password."
            />
            <TextField
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
