import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Slide,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PersonRemoveAlt1Icon from "@mui/icons-material/PersonRemoveAlt1";
import SearchIcon from "@mui/icons-material/Search";
import AccountInfo from "../../components/admin/Account/AccountInfo";
import AccountForm from "../../components/admin/Account/AccountForm";
import AccountDelete from "../../components/admin/Account/AccountDelete";
import AccountDemote from "../../components/admin/Account/AccountDemote";
import PeopleCardList from "../../components/common/PeopleCardList";
import {
  fetchAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  demoteAccount,
} from "../../api/admin/accountAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [openAccountCard, setOpenAccountCard] = useState(false);
  const [openAccountForm, setOpenAccountForm] = useState(false);
  const [openAccountDelete, setOpenAccountDelete] = useState(false);
  const [openAccountDemote, setOpenAccountDemote] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountErrorMessage, setAccountErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState("All");

  const sectionOptions = [
    "All",
    ...new Set(accounts.map((account) => account.section).filter(Boolean)),
  ];

  const filteredAccounts = accounts.filter((account) => {
    const matchesSection =
      selectedSection === "All" || account.section === selectedSection;
    const keyword = searchTerm.trim().toLowerCase();
    const searchable =
      `${account.first_name} ${account.last_name} ${account.student_number} ${account.position} ${account.section}`.toLowerCase();

    const matchesSearch = !keyword || searchable.includes(keyword);
    return matchesSection && matchesSearch;
  });

  // Fetch all accounts from API
  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await fetchAccounts();
      setAccounts(data || []);
    } catch (err) {
      console.error("Error loading accounts:", err);
      setAccountErrorMessage(
        "Failed to load accounts: " + err.message,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Load accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  // ========== ACCOUNT HANDLERS ==========
  // 👁️ View Account Info
  const handleOpenAccountCard = (account) => {
    setSelectedAccount(account);
    setOpenAccountCard(true);
  };

  // ➕ Open Add Account Modal
  const handleOpenAccountAdd = () => {
    setSelectedAccount(null);
    setOpenAccountForm(true);
  };

  // ✏️ Open Edit Account Modal
  const handleOpenAccountEdit = (account) => {
    setSelectedAccount(account);
    setOpenAccountForm(true);
  };

  // 🗑️ Open Delete Account Modal
  const handleOpenAccountDelete = (account) => {
    setSelectedAccount(account);
    setOpenAccountDelete(true);
  };

  // Submit (Add or Edit) Account
  const handleSubmitAccount = async (formData) => {
    try {
      if (selectedAccount) {
        await updateAccount(selectedAccount.officer_id, formData);
        showSnackbar("Account updated successfully", "success");
      } else {
        await addAccount(formData);
        showSnackbar("Account added successfully", "success");
      }
      await loadAccounts();
      setOpenAccountForm(false);
    } catch (err) {
      console.error("Error saving account:", err);
      showSnackbar(err.message || "Error saving account", "error");
      throw err;
    }
  };

  // Delete Account
  const handleDeleteAccount = async (id) => {
    try {
      await deleteAccount(id);
      await loadAccounts();
      setOpenAccountDelete(false);
      showSnackbar("Account deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting account:", err, "error");
      showSnackbar(err.message || "Error deleting account", "error");
    }
  };

  const handleDemoteAccount = async (account) => {
    try {
      await demoteAccount(account.officer_id);
      await loadAccounts();
      setOpenAccountDemote(false);
      setSelectedAccount(null);
      showSnackbar(
        `${account.first_name} ${account.last_name} was demoted to student successfully`,
        "success",
      );
    } catch (err) {
      console.error("Error demoting account:", err);
      showSnackbar(err.message || "Unable to demote account", "error");
    }
  };

  const handleOpenAccountDemote = (account) => {
    setSelectedAccount(account);
    setOpenAccountDemote(true);
  };

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Officials</title>
      </Helmet>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          Officials
        </Typography>
      </Box>

      {!loading && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <TextField
            fullWidth
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or student number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: { sm: 360 },
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(15, 23, 42, 0.55)",
                borderRadius: 2,
              },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
              displayEmpty
              sx={{
                backgroundColor: "rgba(15, 23, 42, 0.55)",
                borderRadius: 2,
                color: "#fff",
              }}
            >
              {sectionOptions.map((section) => (
                <MenuItem key={section} value={section}>
                  {section === "All" ? "All Sections" : `Section ${section}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* People cards */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <PeopleCardList
          items={filteredAccounts}
          rowKey={(account) => account.officer_id}
          emptyMessage="No officials found for this filter."
          columns={[
            { label: "Student Number", key: "student_number" },
            { label: "Position", key: "position" },
            { label: "Year", key: "year" },
            { label: "Section", key: "section" },
            { label: "First Name", key: "first_name" },
            { label: "Last Name", key: "last_name" },
          ]}
          renderActions={(account) => (
            <>
              <Tooltip title="View">
                <IconButton
                  size="small"
                  color="default"
                  onClick={() => handleOpenAccountCard(account)}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleOpenAccountEdit(account)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Demote">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() => handleOpenAccountDemote(account)}
                >
                  <PersonRemoveAlt1Icon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleOpenAccountDelete(account)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        />
      )}

      {/* Modals */}
      <AccountInfo
        open={openAccountCard}
        handleClose={() => setOpenAccountCard(false)}
        selectedAccount={selectedAccount}
      />
      <AccountForm
        open={openAccountForm}
        handleClose={() => setOpenAccountForm(false)}
        selectedAccount={selectedAccount}
        onSubmit={handleSubmitAccount}
      />
      <AccountDelete
        open={openAccountDelete}
        handleClose={() => setOpenAccountDelete(false)}
        selectedAccount={selectedAccount}
        onDelete={handleDeleteAccount}
      />
      <AccountDemote
        open={openAccountDemote}
        handleClose={() => {
          setOpenAccountDemote(false);
          setSelectedAccount(null);
        }}
        selectedAccount={selectedAccount}
        onConfirm={() =>
          selectedAccount && handleDemoteAccount(selectedAccount)
        }
      />

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": {
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
