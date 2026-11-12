import { useEffect, useMemo, useState } from "react";
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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  fetchContributionProof,
  reviewFundContribution,
} from "../../../api/officer/fundAPI";

const money = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

export default function FundContributionReviewDialog({
  open,
  onClose,
  contributions = [],
  onReviewed,
}) {
  const pending = useMemo(
    () => contributions.filter((item) => item.review_status === "Pending"),
    [contributions],
  );
  const [selectedId, setSelectedId] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofLoading, setProofLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const selected = pending.find(
    (item) => Number(item.contribution_id) === Number(selectedId),
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId(pending[0]?.contribution_id ?? null);
    setRemarks("");
    setError("");
  }, [open, pending]);

  useEffect(() => {
    if (!open || !selected || !selected.has_proof) {
      setProofUrl("");
      return undefined;
    }

    let active = true;
    let objectUrl;
    setProofLoading(true);
    setProofUrl("");
    fetchContributionProof(selected.fund_id, selected.contribution_id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setProofUrl(objectUrl);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load proof image.");
      })
      .finally(() => {
        if (active) setProofLoading(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, selected]);

  const handleReview = async (decision) => {
    if (!selected || reviewing) return;
    setReviewing(true);
    setError("");
    try {
      await reviewFundContribution(
        selected.fund_id,
        selected.contribution_id,
        decision,
        remarks,
      );
      setRemarks("");
      await onReviewed?.();
    } catch (reviewError) {
      setError(reviewError.message || "Unable to update this submission.");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={reviewing ? undefined : onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="fund-review-title"
      PaperProps={{ sx: { borderRadius: 3, maxHeight: "calc(100% - 32px)" } }}
    >
      <DialogTitle
        id="fund-review-title"
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800 }}
      >
        Verify contributions
        <IconButton
          onClick={onClose}
          disabled={reviewing}
          aria-label="Close contribution review"
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          {pending.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2.5 }}>
              <Typography variant="h6">No contributions to review</Typography>
              <Typography color="text.secondary">
                New student submissions with proof will appear here.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(260px, 0.8fr) minmax(0, 1.5fr)" }, gap: 2 }}>
              <Stack spacing={1} sx={{ maxHeight: { md: 520 }, overflowY: "auto" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Pending ({pending.length})
                </Typography>
                {pending.map((item) => (
                  <Button
                    key={item.contribution_id}
                    variant={Number(item.contribution_id) === Number(selectedId) ? "contained" : "outlined"}
                    onClick={() => {
                      setSelectedId(item.contribution_id);
                      setRemarks("");
                      setError("");
                    }}
                    sx={{ justifyContent: "flex-start", textAlign: "left", minHeight: 58, textTransform: "none" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 750 }}>
                        {item.member_name}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {item.budget_name} · {money(item.amount)}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Stack>

              {selected && (
                <Stack spacing={2}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {selected.budget_name}
                    </Typography>
                    <Typography color="text.secondary">
                      {selected.member_name} · {selected.position || (selected.member_type === "officer" ? "Officer" : "Student")}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Submitted {money(selected.amount)} via {selected.payment_method} on {selected.payment_date}
                    </Typography>
                    {selected.remarks && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Student note: {selected.remarks}
                      </Typography>
                    )}
                  </Paper>

                  <Paper
                    variant="outlined"
                    sx={{ minHeight: 240, p: 1, display: "grid", placeItems: "center", borderRadius: 2.5, overflow: "hidden" }}
                  >
                    {proofLoading ? (
                      <CircularProgress />
                    ) : proofUrl ? (
                      <Box
                        component="img"
                        src={proofUrl}
                        alt={`Proof of contribution from ${selected.member_name}`}
                        sx={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }}
                      />
                    ) : (
                      <Typography color="text.secondary">
                        Proof image is unavailable.
                      </Typography>
                    )}
                  </Paper>

                  <TextField
                    label="Review note (Optional)"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    disabled={reviewing}
                  />
                  <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1} justifyContent="flex-end">
                    <Button
                      color="error"
                      variant="outlined"
                      onClick={() => handleReview("Rejected")}
                      disabled={reviewing}
                      sx={{ minHeight: 44 }}
                    >
                      {reviewing ? "Saving..." : "Reject"}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleReview("Approved")}
                      disabled={reviewing || proofLoading || !proofUrl}
                      startIcon={reviewing ? <CircularProgress size={18} color="inherit" /> : null}
                      sx={{ minHeight: 44 }}
                    >
                      {reviewing ? "Saving..." : "Approve payment"}
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={reviewing} sx={{ minHeight: 44 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
