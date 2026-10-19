import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Slide,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  addFundContribution,
  fetchFundContributions,
} from "../../../api/officer/fundAPI";

const paymentMethods = ["Cash", "GCash", "Bank Transfer", "Other"];

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const getToday = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getDateOnly = (value) => (value ? String(value).slice(0, 10) : "");

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function FundContributeForm({
  open,
  handleClose,
  fund,
  students = [],
  onSaved,
}) {
  const [contributions, setContributions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rowValues, setRowValues] = useState({});
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const contributionByStudent = useMemo(() => {
    const records = {};

    contributions.forEach((contribution) => {
      const studentId = Number(contribution.student_id);

      // The API returns newest payments first, so the first row is the latest.
      if (!records[studentId]) {
        records[studentId] = {
          total: Number(
            contribution.student_total ?? contribution.amount ?? 0,
          ),
          lastPaymentMethod: contribution.payment_method || "Cash",
          lastPaymentDate: getDateOnly(contribution.payment_date),
        };
      }
    });

    return records;
  }, [contributions]);

  const studentRows = useMemo(() => {
    const requiredAmount = Number(fund?.contribution_amount || 0);

    return students.map((student) => {
      const current = contributionByStudent[Number(student.member_id)];
      const total = Number(current?.total || 0);
      const remaining = Math.max(0, requiredAmount - total);
      const status =
        total >= requiredAmount ? "Paid" : total > 0 ? "Partial" : "Unpaid";

      return {
        ...student,
        total,
        remaining,
        status,
        lastPaymentDate: current?.lastPaymentDate || "",
        lastPaymentMethod: current?.lastPaymentMethod || "Cash",
      };
    });
  }, [students, contributionByStudent, fund]);

  useEffect(() => {
    if (!open || !fund?.fund_id) return;

    setSelectedIds([]);
    setRowValues({});
    setRemarks("");
    setError("");
    setLoading(true);

    fetchFundContributions(fund.fund_id)
      .then((records) => setContributions(records || []))
      .catch((loadError) =>
        setError(
          loadError.message || "Unable to load student contribution status.",
        ),
      )
      .finally(() => setLoading(false));
  }, [open, fund]);

  useEffect(() => {
    if (!open || !studentRows.length) return;

    setRowValues((currentValues) => {
      const nextValues = { ...currentValues };

      studentRows.forEach((student) => {
        if (!nextValues[student.member_id]) {
          nextValues[student.member_id] = {
            amount: student.remaining.toFixed(2),
            payment_date:
              student.status === "Paid" && student.lastPaymentDate
                ? student.lastPaymentDate
                : getToday(),
            payment_method: student.lastPaymentMethod,
          };
        }
      });

      return nextValues;
    });
  }, [open, studentRows]);

  const payableRows = studentRows.filter(
    (student) => student.status !== "Paid",
  );
  const allSelected =
    payableRows.length > 0 &&
    payableRows.every((student) => selectedIds.includes(student.member_id));

  const toggleStudent = (studentId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId],
    );
    setError("");
  };

  const toggleAll = () => {
    setSelectedIds(
      allSelected ? [] : payableRows.map((student) => student.member_id),
    );
    setError("");
  };

  const updateRow = (studentId, field, value) => {
    setRowValues((currentValues) => ({
      ...currentValues,
      [studentId]: {
        ...currentValues[studentId],
        [field]: value,
      },
    }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedIds.length) {
      setError("Select at least one student.");
      return;
    }

    for (const studentId of selectedIds) {
      const values = rowValues[studentId];
      const student = studentRows.find(
        (row) => row.member_id === studentId,
      );
      const amount = String(values?.amount || "").trim();

      if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
        setError("Each selected student must have a valid amount.");
        return;
      }

      if (student && Number(amount) > student.remaining) {
        setError(
          `${student.first_name} ${student.last_name}'s amount cannot exceed ${formatMoney(student.remaining)}.`,
        );
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(values?.payment_date || "")) {
        setError("Each selected student must have a valid payment date.");
        return;
      }

      if (values.payment_date > getToday()) {
        setError("Payment date cannot be in the future.");
        return;
      }
    }

    setSaving(true);
    setError("");
    let recordedCount = 0;

    try {
      // Submit sequentially so the server can recalculate the fund balance
      // after every recorded student payment.
      for (const studentId of selectedIds) {
        const values = rowValues[studentId];

        await addFundContribution(fund.fund_id, {
          student_id: Number(studentId),
          amount: Number(values.amount).toFixed(2),
          payment_date: values.payment_date,
          payment_method: values.payment_method,
          remarks: remarks.trim() || null,
        });

        recordedCount += 1;
      }

      await onSaved?.(recordedCount);
      handleClose();
    } catch (saveError) {
      setError(
        recordedCount
          ? `${recordedCount} contribution(s) were recorded before an error occurred: ${saveError.message}`
          : saveError.message || "Unable to record contributions.",
      );

      if (recordedCount) await onSaved?.(recordedCount);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : handleClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="lg"
      aria-labelledby="fund-contribution-title"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        id="fund-contribution-title"
        sx={{
          fontWeight: "bold",
          m: 0,
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        Record Contributions - {fund?.fund_name}
        <IconButton
          onClick={handleClose}
          size="small"
          disabled={saving}
          aria-label="Close contribution form"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <Typography variant="body2" color="text.secondary">
                Select students and enter the details of their payment.
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                Required per student: {formatMoney(fund?.contribution_amount)}
              </Typography>
            </Box>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                maxHeight: 430,
                boxShadow: "none",
                "& .MuiTableCell-root": {
                  py: 1.25,
                  borderColor: "rgba(148, 163, 184, 0.18)",
                },
                "& .MuiTableHead-root .MuiTableCell-root": {
                  bgcolor: "background.default",
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                },
              }}
            >
              <Table stickyHeader size="small" aria-label="Student contributions">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={selectedIds.length > 0 && !allSelected}
                        onChange={toggleAll}
                        disabled={saving || !payableRows.length}
                        inputProps={{
                          "aria-label": "Select all unpaid students",
                        }}
                      />
                    </TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell sx={{ minWidth: 190 }}>Contribution</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Amount</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Date paid</TableCell>
                    <TableCell sx={{ minWidth: 155 }}>Payment method</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : studentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                        <Typography color="text.secondary">
                          No students are available in this room.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentRows.map((student) => {
                      const selected = selectedIds.includes(student.member_id);
                      const paid = student.status === "Paid";
                      const values = rowValues[student.member_id] || {};

                      return (
                        <TableRow
                          key={student.member_id}
                          hover
                          selected={selected}
                          sx={{
                            "&.Mui-selected": {
                              bgcolor: "rgba(20, 184, 166, 0.06)",
                            },
                            "&.Mui-selected:hover": {
                              bgcolor: "rgba(20, 184, 166, 0.09)",
                            },
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selected}
                              onChange={() => toggleStudent(student.member_id)}
                              disabled={saving || paid}
                              inputProps={{
                                "aria-label": `Select ${student.first_name} ${student.last_name}`,
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {student.first_name} {student.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.section || "No section"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {formatMoney(student.total)}
                              </Typography>
                              <Chip
                                label={student.status}
                                size="small"
                                color={
                                  student.status === "Paid"
                                    ? "success"
                                    : student.status === "Partial"
                                      ? "warning"
                                      : "default"
                                }
                                variant={
                                  student.status === "Unpaid"
                                    ? "outlined"
                                    : "filled"
                                }
                                sx={{
                                  height: 23,
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color:"#fff"
                                }}
                              />
                            </Stack>
                            {student.lastPaymentDate && (
                              <Typography variant="caption" color="text.secondary">
                                Last paid: {student.lastPaymentDate}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={values.amount || ""}
                              onChange={(event) =>
                                updateRow(
                                  student.member_id,
                                  "amount",
                                  event.target.value,
                                )
                              }
                              disabled={!selected || saving || paid}
                              inputProps={{
                                min: "0.01",
                                max: student.remaining,
                                step: "0.01",
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              color={selected || paid ? "text.primary" : "text.secondary"}
                            >
                              {values.payment_date || "-"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              value={values.payment_method || "Cash"}
                              onChange={(event) =>
                                updateRow(
                                  student.member_id,
                                  "payment_method",
                                  event.target.value,
                                )
                              }
                              disabled={!selected || saving || paid}
                            >
                              {paymentMethods.map((method) => (
                                <MenuItem key={method} value={method}>
                                  {method}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Remarks for selected students (Optional)"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              disabled={saving}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button
            onClick={handleClose}
            color="inherit"
            variant="outlined"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || !selectedIds.length}
            startIcon={
              saving ? <CircularProgress size={20} color="inherit" /> : null
            }
            sx={{ fontWeight: "bold", px: 3 }}
          >
            {saving
              ? "Recording..."
              : `Record ${selectedIds.length || ""} Contribution${
                  selectedIds.length === 1 ? "" : "s"
                }`}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
