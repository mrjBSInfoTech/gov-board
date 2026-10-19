import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Slide,
  Stack,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const emptyBudget = {
  budget_name: "",
  category: "Other",
  planned_amount: "",
  spent_amount: "0",
  budget_period: "",
  description: "",
  status: "Planned",
};
const categories = ["Events", "Supplies", "Food", "Transportation", "Other"];
const statuses = ["Planned", "Ongoing", "Completed"];

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function BudgetForm({
  open,
  handleClose,
  selectedBudget,
  onSubmit,
  loading = false,
}) {
  const [formData, setFormData] = useState(emptyBudget);
  const [error, setError] = useState("");
  const isEdit = Boolean(selectedBudget?.budget_id);

  useEffect(() => {
    if (!open) return;
    setFormData(
      selectedBudget
        ? {
            budget_name: selectedBudget.budget_name || "",
            category: selectedBudget.category || "Other",
            planned_amount: String(selectedBudget.planned_amount ?? ""),
            spent_amount: String(selectedBudget.spent_amount ?? "0"),
            budget_period: selectedBudget.budget_period || "",
            description: selectedBudget.description || "",
            status: selectedBudget.status || "Planned",
          }
        : emptyBudget,
    );
    setError("");
  }, [open, selectedBudget]);

  const change = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    const name = formData.budget_name.trim();
    if (
      !name ||
      Number(formData.planned_amount) < 0 ||
      Number(formData.spent_amount) < 0
    ) {
      setError("Enter a budget name and valid planned and spent amounts.");
      return;
    }
    try {
      await onSubmit({
        ...formData,
        budget_name: name,
        planned_amount: Number(formData.planned_amount).toFixed(2),
        spent_amount: Number(formData.spent_amount).toFixed(2),
      });
      handleClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the budget.");
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog
        open={open}
        onClose={loading ? undefined : handleClose}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
        aria-labelledby="budget-form-title"
      >
        <DialogTitle
          id="budget-form-title"
          sx={{
            fontWeight: "bold",
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {isEdit ? "Edit Budget Item" : "Add Budget Item"}
          <IconButton
            onClick={handleClose}
            size="small"
            disabled={loading}
            aria-label="Close budget form"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={submit} noValidate>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Budget Title"
                name="budget_name"
                value={formData.budget_name}
                onChange={change}
                required
                autoFocus
                fullWidth
                disabled={loading}
                inputProps={{ maxLength: 100 }}
              />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  select
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={change}
                  fullWidth
                  disabled={loading}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={change}
                  fullWidth
                  disabled={loading}
                >
                  {statuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Planned Amount"
                  name="planned_amount"
                  value={formData.planned_amount}
                  onChange={change}
                  type="number"
                  required
                  fullWidth
                  disabled={loading}
                  inputProps={{ min: 0, step: "0.01" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Amount Spent"
                  name="spent_amount"
                  value={formData.spent_amount}
                  onChange={change}
                  type="number"
                  required
                  fullWidth
                  disabled={loading}
                  inputProps={{ min: 0, step: "0.01" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                  }}
                />
                <DatePicker
                  label="Budget Date"
                  value={
                    formData.budget_period
                      ? dayjs(formData.budget_period)
                      : null
                  }
                  onChange={(date) => {
                    setFormData((current) => ({
                      ...current,
                      budget_period: date?.isValid()
                        ? date.format("YYYY-MM-DD")
                        : "",
                    }));
                    setError("");
                  }}
                  disabled={loading}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
              <TextField
                label="Notes (Optional)"
                name="description"
                value={formData.description}
                onChange={change}
                multiline
                rows={3}
                fullWidth
                disabled={loading}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, px: 3 }}>
            <Button
              onClick={handleClose}
              color="inherit"
              variant="outlined"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={20} color="inherit" /> : null
              }
              sx={{ fontWeight: "bold", px: 3 }}
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Budget"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
}
