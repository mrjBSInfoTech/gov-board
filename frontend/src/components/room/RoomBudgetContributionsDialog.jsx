import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  fetchMyPlanSubmissions,
  fetchRoomBudgetPlans,
  submitBudgetContribution,
} from "../../api/student/budgetContributionAPI";

const paymentMethods = ["Cash", "GCash", "Bank Transfer", "Other"];
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const cents = (amount) => Math.round(Number(amount || 0) * 100);
const money = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

export default function RoomBudgetContributionsDialog({
  open,
  onClose,
  roomId,
  memberType = "student",
}) {
  const [plans, setPlans] = useState([]);
  const [selectedFundId, setSelectedFundId] = useState(null);
  const [history, setHistory] = useState([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [proofPreviewUrl, setProofPreviewUrl] = useState("");
  const requestId = useRef(0);

  const selectedPlan = useMemo(
    () => plans.find((plan) => Number(plan.fund_id) === Number(selectedFundId)),
    [plans, selectedFundId],
  );
  const availableAmount = selectedPlan
    ? Math.max(
        0,
        Math.min(
          cents(selectedPlan.contribution_amount) -
            cents(selectedPlan.my_approved_amount) -
            cents(selectedPlan.my_pending_amount),
          cents(selectedPlan.target_amount) -
            cents(selectedPlan.total_collected) -
            cents(selectedPlan.total_pending),
        ),
      ) / 100
    : 0;

  const loadPlans = useCallback(async (targetRoomId, currentRequestId) => {
    setLoading(true);
    try {
      const records = await fetchRoomBudgetPlans(targetRoomId, memberType);
      if (currentRequestId !== requestId.current) return;
      setPlans(records);
      setSelectedFundId((current) =>
        records.some((plan) => Number(plan.fund_id) === Number(current))
          ? current
          : records[0]?.fund_id ?? null,
      );
      setError("");
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setError(loadError.message || "Unable to load budget plans.");
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [memberType]);

  useEffect(() => {
    if (!open || !roomId) return undefined;
    const currentRequestId = ++requestId.current;
    setPlans([]);
    setHistory([]);
    setSelectedFundId(null);
    setAmount("");
    setProof(null);
    setRemarks("");
    setSubmitting(false);
    setError("");
    void loadPlans(roomId, currentRequestId);
    return () => {
      if (requestId.current === currentRequestId) requestId.current += 1;
    };
  }, [open, roomId, memberType, loadPlans]);

  useEffect(() => {
    if (!proof) {
      setProofPreviewUrl("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(proof);
    setProofPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [proof]);

  useEffect(() => {
    if (!open || !selectedFundId || !roomId) {
      setHistory([]);
      return;
    }
    let active = true;
    setHistoryLoading(true);
    fetchMyPlanSubmissions(roomId, selectedFundId, memberType)
      .then((records) => {
        if (active) setHistory(records);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load your contribution history.");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, roomId, selectedFundId, memberType]);

  const handleProof = (file) => {
    setError("");
    setProof(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_PROOF_SIZE) {
      setError("Proof images must be 5 MB or smaller.");
      return;
    }
    setProof(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPlan || !proof || submitting) return;
    const value = Number(amount);
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || value <= 0) {
      setError("Enter a contribution amount greater than zero.");
      return;
    }
    if (value > availableAmount) {
      setError(`You can submit up to ${money(availableAmount)} for this plan right now.`);
      return;
    }
    const submissionRequestId = requestId.current;
    const submittedRoomId = roomId;
    const submittedFundId = selectedPlan.fund_id;
    setSubmitting(true);
    setError("");
    try {
      await submitBudgetContribution(selectedPlan.fund_id, {
        roomId: submittedRoomId,
        amount: value.toFixed(2),
        payment_method: paymentMethod,
        remarks,
        proof,
      }, memberType);
      if (submissionRequestId !== requestId.current) return;
      setAmount("");
      setProof(null);
      setRemarks("");
      await loadPlans(submittedRoomId, submissionRequestId);
      const records = await fetchMyPlanSubmissions(
        submittedRoomId,
        submittedFundId,
        memberType,
      );
      if (submissionRequestId === requestId.current) setHistory(records);
    } catch (submitError) {
      if (submissionRequestId === requestId.current) {
        setError(submitError.message || "Unable to submit your contribution.");
      }
    } finally {
      if (submissionRequestId === requestId.current) setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="room-budget-title"
      PaperProps={{ sx: { borderRadius: 3, maxHeight: "calc(100% - 32px)" } }}
    >
      <DialogTitle
        id="room-budget-title"
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 800 }}
      >
        Room budget plans
        <IconButton
          onClick={onClose}
          disabled={submitting}
          aria-label="Close budget plans"
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          {loading ? (
            <Box sx={{ minHeight: 180, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : error && plans.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2.5 }}>
              <Typography variant="h6">Unable to load budget plans</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                Check your connection or account session, then try again.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => loadPlans(roomId, requestId.current)}
                sx={{ minHeight: 44, textTransform: "none" }}
              >
                Try again
              </Button>
            </Paper>
          ) : plans.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2.5 }}>
              <Typography variant="h6">No open budget plans</Typography>
              <Typography color="text.secondary">
                There are no budget collections available in this room right now.
              </Typography>
            </Paper>
          ) : (
            <>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Choose a budget plan
                </Typography>
                {plans.map((plan) => (
                  <Button
                    key={plan.fund_id}
                    variant={Number(plan.fund_id) === Number(selectedFundId) ? "contained" : "outlined"}
                    disabled={submitting}
                    onClick={() => {
                      setSelectedFundId(plan.fund_id);
                      setAmount("");
                      setProof(null);
                      setError("");
                    }}
                    sx={{ justifyContent: "space-between", minHeight: 48, textTransform: "none", gap: 1 }}
                  >
                    <Box sx={{ textAlign: "left", minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 700 }}>{plan.budget_name}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {money(plan.total_collected)} collected of {money(plan.target_amount)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      color={Number(plan.my_pending_amount) > 0 ? "warning" : "default"}
                      label={Number(plan.my_pending_amount) > 0 ? `${money(plan.my_pending_amount)} pending` : `${money(plan.my_approved_amount)} approved`}
                    />
                  </Button>
                ))}
              </Stack>

              {selectedPlan && (
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedPlan.budget_name}</Typography>
                      <Typography color="text.secondary">
                        {selectedPlan.description || "No description provided."}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Suggested per member: <strong>{money(selectedPlan.contribution_amount)}</strong>
                        {" · "}Approved: <strong>{money(selectedPlan.my_approved_amount)}</strong>
                        {" · "}Pending review: <strong>{money(selectedPlan.my_pending_amount)}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Remaining for you: {money(availableAmount)}
                        {selectedPlan.deadline ? ` · Deadline: ${selectedPlan.deadline}` : ""}
                      </Typography>
                    </Box>

                    {availableAmount > 0 ? (
                      <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={2}>
                          <TextField
                            label="Amount paid"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            type="number"
                            required
                            fullWidth
                            disabled={submitting}
                            inputProps={{ min: "0.01", max: availableAmount, step: "0.01" }}
                            InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                            helperText="Partial payments are allowed. Approved payments reduce what remains."
                          />
                          <TextField
                            select
                            label="Payment method"
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value)}
                            fullWidth
                            disabled={submitting}
                          >
                            {paymentMethods.map((method) => (
                              <MenuItem key={method} value={method}>{method}</MenuItem>
                            ))}
                          </TextField>
                          <Button
                            component="label"
                            variant="outlined"
                            disabled={submitting}
                            sx={{ minHeight: 44, textTransform: "none" }}
                          >
                            {proof ? `Proof: ${proof.name}` : "Upload proof photo"}
                            <input
                              hidden
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              aria-label="Upload contribution proof image"
                              onChange={(event) => handleProof(event.target.files?.[0])}
                            />
                          </Button>
                          {proof && (
                            <Box
                              component="img"
                              src={proofPreviewUrl}
                              alt="Selected contribution proof preview"
                              sx={{ maxHeight: 220, maxWidth: "100%", objectFit: "contain", alignSelf: "flex-start", borderRadius: 1 }}
                            />
                          )}
                          <TextField
                            label="Note (Optional)"
                            value={remarks}
                            onChange={(event) => setRemarks(event.target.value)}
                            multiline
                            minRows={2}
                            fullWidth
                            disabled={submitting}
                          />
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting || !proof || !amount}
                            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                            sx={{ minHeight: 44, alignSelf: { xs: "stretch", sm: "flex-start" }, textTransform: "none", fontWeight: 800 }}
                          >
                            {submitting ? "Submitting..." : "Submit for verification"}
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Alert severity={Number(selectedPlan.my_pending_amount) > 0 ? "info" : "success"}>
                        {Number(selectedPlan.my_pending_amount) > 0
                          ? "Your remaining contribution is waiting for officer review."
                          : "Your contribution for this plan is complete."}
                      </Alert>
                    )}

                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                        Your submissions
                      </Typography>
                      <Paper variant="outlined" sx={{ overflowX: "auto", borderRadius: 2 }}>
                        <Table size="small" aria-label="Your budget contribution submissions" sx={{ minWidth: 520 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell align="right">Amount</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Officer note</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {historyLoading ? (
                              <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={22} /></TableCell></TableRow>
                            ) : history.length ? history.map((entry) => (
                              <TableRow key={entry.contribution_id}>
                                <TableCell>{entry.payment_date}</TableCell>
                                <TableCell align="right">{money(entry.amount)}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={entry.review_status}
                                    color={entry.review_status === "Approved" ? "success" : entry.review_status === "Rejected" ? "error" : "warning"}
                                  />
                                </TableCell>
                                <TableCell>{entry.review_remarks || "—"}</TableCell>
                              </TableRow>
                            )) : (
                              <TableRow><TableCell colSpan={4} align="center">No submissions yet.</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </Paper>
                    </Box>
                  </Stack>
                </Paper>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ minHeight: 44 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
