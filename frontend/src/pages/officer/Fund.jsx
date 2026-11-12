import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
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
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import SearchIcon from "@mui/icons-material/Search";
import FundCard from "../../components/officer/Fund/FundCard";
import FundContributeForm from "../../components/officer/Fund/FundContributeForm";
import FundContributionReviewDialog from "../../components/officer/Fund/FundContributionReviewDialog";
import {
  fetchFunds,
  fetchRoomFundContributions,
} from "../../api/officer/fundAPI";
import { fetchMyRoom, fetchRoomMembers } from "../../api/roomAPI";

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};

export default function FundPage({ roomId: selectedRoomId, readOnly = false }) {
  const [room, setRoom] = useState(null);
  const [funds, setFunds] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [contributeOpen, setContributeOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [notice, setNotice] = useState("");
  const loadGeneration = useRef(0);
  const activeRoomId = useRef(null);

  const loadFunds = useCallback(async (roomId, generation = loadGeneration.current) => {
    if (!roomId) {
      setFunds([]);
      setContributions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [roomFunds, roomContributions] = await Promise.all([
        fetchFunds(roomId),
        fetchRoomFundContributions(roomId),
      ]);
      if (generation !== loadGeneration.current) return;
      setFunds(roomFunds);
      setContributions(roomContributions);
      setSelectedFund((current) =>
        current
          ? roomFunds.find((fund) => fund.fund_id === current.fund_id) || current
          : current,
      );
      setError("");
    } catch (loadError) {
      if (generation !== loadGeneration.current) return;
      setError(loadError.message || "Unable to load funds.");
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const generation = ++loadGeneration.current;
    activeRoomId.current = null;
    setRoom(null);
    setFunds([]);
    setContributions([]);
    setStudents([]);
    setSelectedFund(null);
    setContributeOpen(false);
    setReviewOpen(false);
    setError("");
    setLoading(true);

    const loadRoom = async () => {
      try {
        const currentRoom = await fetchMyRoom(selectedRoomId);
        if (!active || generation !== loadGeneration.current) return;

        setRoom(currentRoom || null);
        if (currentRoom?.room_id) {
          activeRoomId.current = Number(currentRoom.room_id);
          localStorage.setItem("joinedRoom", JSON.stringify(currentRoom));
          const members = await fetchRoomMembers(currentRoom.room_id);
          if (!active || generation !== loadGeneration.current) return;
          setStudents(members || []);
          await loadFunds(currentRoom.room_id, generation);
        } else {
          if (generation === loadGeneration.current) setLoading(false);
        }
      } catch (loadError) {
        if (!active || generation !== loadGeneration.current) return;
        setLoading(false);
        setError(loadError.message || "Unable to load your room.");
      }
    };

    loadRoom();
    return () => {
      active = false;
      activeRoomId.current = null;
      if (loadGeneration.current === generation) loadGeneration.current += 1;
    };
  }, [loadFunds, selectedRoomId]);

  const visibleFunds = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return funds;

    return funds.filter((fund) =>
      [fund.fund_name, fund.description, fund.status, fund.budget_id ? "budget plan" : "historical fund"]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [funds, search]);

  const visibleContributions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contributions;
    return contributions.filter((contribution) =>
      [
        contribution.member_name,
        contribution.budget_name,
        contribution.fund_name,
        contribution.payment_method,
        contribution.remarks,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [contributions, search]);

  const planTotals = useMemo(
    () =>
      funds
        .filter((fund) => fund.budget_id)
        .reduce(
          (totals, fund) => ({
            needed: totals.needed + Number(fund.target_amount || 0),
            collected: totals.collected + Number(fund.total_contributed || 0),
          }),
          { needed: 0, collected: 0 },
        ),
    [funds],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Funds</title>
      </Helmet>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 }, mb: 1 }}
          >
            Funds
          </Typography>
          <Typography color="text.secondary">
            {room
              ? "Review budget collections and keep a room-wide record of member payments."
              : "Join a room to review member contributions."}
          </Typography>
        </Box>
        {room && !readOnly && (
          <Button
            variant="contained"
            onClick={() => setReviewOpen(true)}
            sx={{ minHeight: 44, width: { xs: "100%", sm: "auto" }, textTransform: "none", fontWeight: 800 }}
          >
            Verify contributions ({contributions.filter((item) => item.review_status === "Pending").length})
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {room && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 3, borderRadius: 3 }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search plans, members, or payments"
            inputProps={{ "aria-label": "Search plans, members, or payments" }}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Paper>
      )}

      {loading ? (
        <Box sx={{ minHeight: 260, display: "grid", placeItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : !room ? (
        <Paper
          variant="outlined"
          sx={{ p: 5, textAlign: "center", borderRadius: 3 }}
        >
          <Typography variant="h6">No room joined</Typography>
          <Typography color="text.secondary">
            Join a room from the Room menu to view its budget collections.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            {[
              { label: "Needed by budget plans", amount: planTotals.needed, color: "primary.main" },
              { label: "Collected for plans", amount: planTotals.collected, color: "success.main" },
              { label: "Still to collect", amount: Math.max(0, planTotals.needed - planTotals.collected), color: "warning.main" },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: item.color }}>
                    {formatMoney(item.amount)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
              Collections by budget plan
            </Typography>
            {visibleFunds.filter((fund) => fund.budget_id).length ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                {visibleFunds.filter((fund) => fund.budget_id).map((fund) => (
                  <FundCard
                    key={fund.fund_id}
                    fund={fund}
                  />
                ))}
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
                <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 44, color: "text.disabled", mb: 0.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {search ? "No matching budget plans" : "No budget plans yet"}
                </Typography>
                <Typography color="text.secondary">
                  {search ? "Try another search." : "Create a plan in Budget to start collecting member contributions."}
                </Typography>
              </Paper>
            )}
          </Box>

          {visibleFunds.some((fund) => !fund.budget_id) && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                Historical funds
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                {visibleFunds.filter((fund) => !fund.budget_id).map((fund) => (
                  <FundCard
                    key={fund.fund_id}
                    fund={fund}
                    onContribute={readOnly ? undefined : (selected) => {
                      setSelectedFund(selected);
                      setContributeOpen(true);
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
              Member contribution log
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, maxWidth: "100%" }}>
              <Table size="small" aria-label="Member contribution log" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Budget / fund</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Date paid</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleContributions.length ? visibleContributions.map((contribution) => (
                    <TableRow key={contribution.contribution_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {contribution.member_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contribution.position || (contribution.member_type === "officer" ? "Officer" : "Member")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{contribution.budget_name}</Typography>
                        {!contribution.budget_id && <Chip size="small" label="Historical" variant="outlined" sx={{ mt: 0.4 }} />}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {formatMoney(contribution.amount)}
                      </TableCell>
                      <TableCell>{formatDate(contribution.payment_date)}</TableCell>
                      <TableCell>{contribution.payment_method}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5} alignItems="flex-start">
                          <Chip
                            size="small"
                            label={contribution.review_status || "Approved"}
                            color={
                              contribution.review_status === "Pending"
                                ? "warning"
                                : contribution.review_status === "Rejected"
                                  ? "error"
                                  : "success"
                            }
                          />
                          <Typography variant="caption">
                            {contribution.review_remarks || contribution.remarks || "—"}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        {search ? "No matching payments." : "No member payments recorded yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      )}

      {!readOnly && <FundContributeForm
        open={contributeOpen}
        handleClose={() => setContributeOpen(false)}
        fund={selectedFund}
        students={students}
        onSaved={async (count) => {
          await loadFunds(room?.room_id);
          setNotice(
            `${count} contribution${count === 1 ? "" : "s"} recorded successfully.`,
          );
        }}
      />}
      {!readOnly && <FundContributionReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        contributions={contributions}
        onReviewed={() => {
          const currentRoomId = activeRoomId.current;
          if (currentRoomId !== Number(room?.room_id)) return undefined;
          return loadFunds(currentRoomId, loadGeneration.current);
        }}
      />}
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
        onClose={() => setNotice("")}
        message={notice}
      />
    </Box>
  );
}
