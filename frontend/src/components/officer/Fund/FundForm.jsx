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
import dayjs from "dayjs";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const emptyForm = {
  fund_name: "",
  description: "",
  target_amount: "",
  contribution_amount: "",
  deadline: "",
  status: "Collecting",
};
const statuses = ["Collecting", "Active", "Closed"];
const isValidAmount = (value) =>
  /^\d+(\.\d{1,2})?$/.test(value) &&
  Number(value) > 0 && Number(value) <= 99999999.99;

function FundForm({
  open,
  handleClose,
  onSubmit,
  selectedFund,
  initialData,
  roomId,
  loading = false,
}) {
  const fund = selectedFund ?? initialData;
  const isEdit = Boolean(fund?.fund_id);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitInProgress = useRef(false);
  const isBusy = loading || submitting;

  // Prefill when editing; reset when opening a new fund.
  useEffect(() => {
    if (!open) return;
    if (fund) {
      setFormData({
        fund_name: String(fund.fund_name ?? ""),
        description: String(fund.description ?? ""),
        target_amount: String(fund.target_amount ?? ""),
        contribution_amount: String(fund.contribution_amount ?? ""),
        deadline: fund.deadline && dayjs(fund.deadline).isValid()
          ? dayjs(fund.deadline).format("YYYY-MM-DD") : "",
        status: fund.status ?? "Collecting",
      });
    } else {
      setFormData(emptyForm);
    }
    setError("");
  }, [open, fund]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || submitInProgress.current) return;

    const fundName = formData.fund_name.trim();
    if (!fundName) {
      setError("Fund name is required.");
      return;
    }
    if (fundName.length > 100) {
      setError("Fund name must be 100 characters or fewer.");
      return;
    }
    if (!isValidAmount(formData.target_amount.trim())) {
      setError("Enter a target amount greater than 0, up to 99,999,999.99, with at most 2 decimal places.");
      return;
    }
    if (!isValidAmount(formData.contribution_amount.trim())) {
      setError("Enter a contribution amount greater than 0, up to 99,999,999.99, with at most 2 decimal places.");
      return;
    }
    if (formData.deadline && (
      !dayjs(formData.deadline).isValid() ||
      dayjs(formData.deadline).format("YYYY-MM-DD") !== formData.deadline
    )) {
      setError("Please select a valid deadline.");
      return;
    }
    if (!statuses.includes(formData.status)) {
      setError("Please select a valid status.");
      return;
    }

    const payload = {
      fund_name: fundName,
      description: formData.description.trim() || null,
      target_amount: Number(formData.target_amount).toFixed(2),
      contribution_amount: Number(formData.contribution_amount).toFixed(2),
      deadline: formData.deadline || null,
      status: formData.status,
    };
    // Room context comes from the parent; creator and timestamps belong to the API.
    const resolvedRoomId = roomId ?? fund?.room_id;
    if (!Number.isInteger(Number(resolvedRoomId)) || Number(resolvedRoomId) < 1) {
      setError("Please select a valid room before saving the fund.");
      return;
    }
    payload.room_id = Number(resolvedRoomId);

    setError("");
    submitInProgress.current = true;
    setSubmitting(true);
    try {
      const result = await onSubmit(payload);
      if (result === false) {
        setError("Unable to save the fund. Please try again.");
        return;
      }
      handleClose();
    } catch (submitError) {
      setError(submitError.response?.data?.message || submitError.message || "Unable to save the fund. Please try again.");
    } finally {
      submitInProgress.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isBusy ? undefined : handleClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
      aria-labelledby="fund-form-title"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        id="fund-form-title"
        sx={{ fontWeight: "bold", m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        {isEdit ? "Edit Fund" : "Add Fund"}
        <IconButton onClick={handleClose} size="small" disabled={isBusy} aria-label="Close fund form">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Native form submission supports Enter; multiline descriptions keep newlines. */}
      <form onSubmit={handleSubmit} noValidate>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Fund Name"
              name="fund_name"
              value={formData.fund_name}
              onChange={handleChange}
              placeholder="Enter fund name"
              required
              autoFocus
              fullWidth
              disabled={isBusy}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Description (Optional)"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What is this fund for?"
              multiline
              rows={3}
              fullWidth
              disabled={isBusy}
            />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Target Amount"
                name="target_amount"
                value={formData.target_amount}
                onChange={handleChange}
                type="number"
                required
                fullWidth
                disabled={isBusy}
                inputProps={{ min: "0.01", max: "99999999.99", step: "0.01" }}
                InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
              />
              <TextField
                label="Contribution Amount"
                name="contribution_amount"
                value={formData.contribution_amount}
                onChange={handleChange}
                helperText="Amount to collect per student."
                type="number"
                required
                fullWidth
                disabled={isBusy}
                inputProps={{ min: "0.01", max: "99999999.99", step: "0.01" }}
                InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
              />
              <TextField
                label="Deadline (Optional)"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                type="date"
                fullWidth
                disabled={isBusy}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                select
                required
                fullWidth
                disabled={isBusy}
              >
                {statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </TextField>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={handleClose} color="inherit" variant="outlined" disabled={isBusy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isBusy}
            startIcon={isBusy ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ fontWeight: "bold", px: 3 }}
          >
            {isBusy ? (isEdit ? "Updating..." : "Adding...") : isEdit ? "Save Changes" : "Add Fund"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default FundForm;
