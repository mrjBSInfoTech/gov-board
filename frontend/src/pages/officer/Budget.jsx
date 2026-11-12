import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import { fetchMyRoom, fetchRoomMembers } from "../../api/roomAPI";
import {
  addBudget,
  deleteBudget,
  fetchBudgets,
  updateBudget,
} from "../../api/officer/budgetAPI";
import BudgetForm from "../../components/officer/Budget/BudgetForm";
import BudgetCard from "../../components/officer/Budget/BudgetCard";

const money = (amount) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(amount || 0),
  );

function SummaryCard({ label, value, color }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color }}>
        {money(value)}
      </Typography>
    </Paper>
  );
}

export default function BudgetPage({ roomId: selectedRoomId, readOnly = false }) {
  const [room, setRoom] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [notice, setNotice] = useState("");
  const loadGeneration = useRef(0);

  const loadBudgets = useCallback(async (roomId, generation = loadGeneration.current) => {
    if (!roomId) return;
    setLoading(true);
    try {
      const [budgetRecords, roomMembers] = await Promise.all([
        fetchBudgets(roomId),
        fetchRoomMembers(roomId),
      ]);
      if (generation !== loadGeneration.current) return;
      setBudgets(budgetRecords);
      setMemberCount(roomMembers.length);
      setError("");
    } catch (loadError) {
      if (generation !== loadGeneration.current) return;
      setError(loadError.message || "Unable to load budget records.");
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const generation = ++loadGeneration.current;
    setRoom(null);
    setBudgets([]);
    setMemberCount(0);
    setError("");
    setSelected(null);
    setDialogOpen(false);
    setLoading(true);
    fetchMyRoom(selectedRoomId)
      .then(async (currentRoom) => {
        if (!active || generation !== loadGeneration.current) return;
        setRoom(currentRoom || null);
        if (currentRoom?.room_id) await loadBudgets(currentRoom.room_id, generation);
        else if (generation === loadGeneration.current) setLoading(false);
      })
      .catch((loadError) => {
        if (active && generation === loadGeneration.current) {
          setLoading(false);
          setError(loadError.message || "Unable to load your room.");
        }
      });
    return () => {
      active = false;
      if (loadGeneration.current === generation) loadGeneration.current += 1;
    };
  }, [loadBudgets, selectedRoomId]);

  const totals = useMemo(
    () =>
      budgets.reduce(
        (total, item) => ({
          planned: total.planned + Number(item.planned_amount || 0),
          collected: total.collected + Number(item.total_collected || 0),
        }),
          { planned: 0, collected: 0 },
      ),
    [budgets],
  );

  const openAdd = () => {
    setSelected(null);
    setDialogOpen(true);
  };
  const openEdit = (budget) => {
    setSelected(budget);
    setDialogOpen(true);
  };

  const save = async (form) => {
    if (!room) return;
    setSaving(true);
    try {
      const payload = { ...form, room_id: room.room_id };
      if (selected) {
        await updateBudget(selected.budget_id, payload);
        setNotice("Budget plan updated.");
      } else {
        await addBudget(payload);
        setNotice("Budget plan created.");
      }
      await loadBudgets(room.room_id);
    } catch (saveError) {
      setError(saveError.message || "Unable to save the budget.");
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (budget) => {
    if (Number(budget.total_collected || 0) > 0) {
      setError("This budget has recorded member contributions and cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete "${budget.budget_name}"?`)) return;
    try {
      await deleteBudget(budget.budget_id);
      await loadBudgets(room?.room_id);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete the budget.");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Budget</title>
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
            Budget
          </Typography>
          <Typography color="text.secondary">
            Plan what your room needs and follow member contributions as they come in.
          </Typography>
        </Box>
        {room && !readOnly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
            sx={{
              width: { xs: "100%", sm: 150 },
              height: 44,
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
            }}
          >
            Add Budget Plan
          </Button>
        )}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {room && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard
              label="Total needed"
              value={totals.planned}
              color="primary.main"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard
              label="Collected so far"
              value={totals.collected}
              color="success.main"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard
              label="Still to collect"
              value={Math.max(0, totals.planned - totals.collected)}
              color="warning.main"
            />
          </Grid>
        </Grid>
      )}

      {loading ? (
        <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : !room ? (
        <Paper
          variant="outlined"
          sx={{ p: 5, textAlign: "center", borderRadius: 3 }}
        >
          <Typography variant="h6">No room joined</Typography>
          <Typography color="text.secondary">
            Join a room before managing a budget.
          </Typography>
        </Paper>
      ) : budgets.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 5, textAlign: "center", borderRadius: 3 }}
        >
          <AccountBalanceOutlinedIcon
            sx={{ fontSize: 56, color: "text.disabled" }}
          />
          <Typography variant="h6">No budget items yet</Typography>
          <Typography color="text.secondary">
            Add a budget plan to set a target and calculate the suggested share per room member.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1.5,
            alignItems: "stretch",
          }}
        >
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.budget_id}
              budget={budget}
              onEdit={readOnly ? undefined : openEdit}
              onDelete={readOnly ? undefined : remove}
            />
          ))}
        </Box>
      )}

      {!readOnly && <BudgetForm
        open={dialogOpen}
        handleClose={() => !saving && setDialogOpen(false)}
        selectedBudget={selected}
        memberCount={memberCount}
        onSubmit={save}
        loading={saving}
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
