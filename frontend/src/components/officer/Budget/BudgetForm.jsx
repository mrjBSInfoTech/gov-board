import React, { useEffect, useState } from "react";
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

const emptyBudget = {
  budget_name: "",
  category: "Other",
  planned_amount: "",
  deadline: "",
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
  memberCount = 0,
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
            deadline: selectedBudget.deadline || "",
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
    if (!name || Number(formData.planned_amount) <= 0) {
      setError("Enter a budget name and an amount needed greater than zero.");
      return;
    }
    try {
      await onSubmit({
        ...formData,
        budget_name: name,
        planned_amount: Number(formData.planned_amount).toFixed(2),
      });
      handleClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the budget.");
    }
  };

  return (
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
          {isEdit ? "Edit Budget Plan" : "Add Budget Plan"}
          <IconButton
            onClick={handleClose}
            size="small"
            disabled={loading}
            aria-label="Close budget form"
            sx={{ minWidth: 44, minHeight: 44 }}
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
                  label="Amount Needed"
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
                  label="Suggested amount per member"
                  value={
                    memberCount > 0 && Number(formData.planned_amount) > 0
                      ?                       Math.max(
                        0.01,
                        Math.floor(
                          Math.round(Number(formData.planned_amount) * 100) /
                            memberCount,
                        ) / 100,
                      ).toFixed(2)
                      : ""
                  }
                  helperText={
                    memberCount
                      ? `Based on ${memberCount} room member${memberCount === 1 ? "" : "s"}; calculated automatically.`
                      : "Room members are still loading."
                  }
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                  }}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Deadline (Optional)"
                  name="deadline"
                  value={formData.deadline}
                  onChange={change}
                  type="date"
                  fullWidth
                  disabled={loading}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <TextField
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={change}
                placeholder="What is this budget for?"
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
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Budget Plan"}
            </Button>
          </DialogActions>
        </Box>
    </Dialog>
  );
}
