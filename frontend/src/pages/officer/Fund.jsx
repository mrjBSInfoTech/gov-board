import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import SearchIcon from "@mui/icons-material/Search";
import FundCard from "../../components/officer/Fund/FundCard";
import FundContributeForm from "../../components/officer/Fund/FundContributeForm";
import FundDelete from "../../components/officer/Fund/FundDelete";
import FundForm from "../../components/officer/Fund/FundForm";
import {
  addFund,
  deleteFund,
  fetchFunds,
  updateFund,
} from "../../api/officer/fundAPI";
import { fetchMyRoom, fetchRoomMembers } from "../../api/roomAPI";

export default function FundPage() {
  const [room, setRoom] = useState(null);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");

  const loadFunds = useCallback(async (roomId) => {
    if (!roomId) {
      setFunds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setFunds(await fetchFunds(roomId));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load funds.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadRoom = async () => {
      try {
        const currentRoom = await fetchMyRoom();
        if (!active) return;

        setRoom(currentRoom || null);
        if (currentRoom?.room_id) {
          localStorage.setItem("joinedRoom", JSON.stringify(currentRoom));
          const members = await fetchRoomMembers(currentRoom.room_id);
          setStudents(
            (members || []).filter(
              (member) => member.member_type === "student",
            ),
          );
          await loadFunds(currentRoom.room_id);
        } else {
          setLoading(false);
        }
      } catch (loadError) {
        if (!active) return;
        setLoading(false);
        setError(loadError.message || "Unable to load your room.");
      }
    };

    loadRoom();
    return () => {
      active = false;
    };
  }, [loadFunds]);

  const visibleFunds = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return funds;

    return funds.filter((fund) =>
      [fund.fund_name, fund.description, fund.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [funds, search]);

  const closeForm = () => {
    if (!saving) {
      setFormOpen(false);
      setSelectedFund(null);
    }
  };

  const saveFund = async (fundData) => {
    setSaving(true);
    try {
      if (selectedFund) {
        await updateFund(selectedFund.fund_id, fundData);
        setNotice("Fund updated successfully.");
      } else {
        await addFund(fundData);
        setNotice("Fund added successfully.");
      }
      setFormOpen(false);
      setSelectedFund(null);
      await loadFunds(room?.room_id);
    } catch (saveError) {
      setError(saveError.message || "Unable to save the fund.");
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const removeFund = async (fundId) => {
    setDeleting(true);
    try {
      await deleteFund(fundId);
      setDeleteOpen(false);
      setSelectedFund(null);
      setNotice("Fund deleted successfully.");
      await loadFunds(room?.room_id);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete the fund.");
    } finally {
      setDeleting(false);
    }
  };

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
              ? "Manage funds for your room."
              : "Join a room to manage funds."}
          </Typography>
        </Box>
        {room && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedFund(null);
              setFormOpen(true);
            }}
            sx={{
              width: { xs: "100%", sm: 150 },
              height: { xs: 35, sm: 45 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
            }}
          >
            Add Fund
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
            placeholder="Search funds"
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
            Join a room from the Room menu before creating a fund.
          </Typography>
        </Paper>
      ) : visibleFunds.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 5, textAlign: "center", borderRadius: 3 }}
        >
          <AccountBalanceWalletOutlinedIcon
            sx={{ fontSize: 56, color: "text.disabled", mb: 1 }}
          />
          <Typography variant="h6">
            {search ? "No matching funds" : "No funds yet"}
          </Typography>
          <Typography color="text.secondary">
            {search
              ? "Try a different search term."
              : "Use Add Fund to create the first fund."}
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
          {visibleFunds.map((fund) => (
            <FundCard
              key={fund.fund_id}
              fund={fund}
              onEdit={(selected) => {
                setSelectedFund(selected);
                setFormOpen(true);
              }}
              onDelete={(selected) => {
                setSelectedFund(selected);
                setDeleteOpen(true);
              }}
              onContribute={(selected) => {
                setSelectedFund(selected);
                setContributeOpen(true);
              }}
            />
          ))}
        </Box>
      )}

      <FundForm
        open={formOpen}
        handleClose={closeForm}
        selectedFund={selectedFund}
        roomId={room?.room_id}
        onSubmit={saveFund}
        loading={saving}
      />
      <FundDelete
        open={deleteOpen}
        handleClose={() => !deleting && setDeleteOpen(false)}
        selectedFund={selectedFund}
        onDelete={removeFund}
        loading={deleting}
      />
      <FundContributeForm
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
      />
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
        onClose={() => setNotice("")}
        message={notice}
      />
    </Box>
  );
}
