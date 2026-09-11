import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Slide,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccountInfo from "../../components/admin/Account/AccountInfo";
import AccountForm from "../../components/admin/Account/AccountForm";
import AccountDelete from "../../components/admin/Account/AccountDelete";
import {
  fetchAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
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
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountErrorMessage, setAccountErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [loading, setLoading] = useState(true);


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
      setAccountErrorMessage(err.message || "Error saving account", "error");
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
      setAccountErrorMessage(
        err.message || "Error deleting account",
        "error",
      );
    }
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
        <title>Account</title>
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
          Account
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAccountAdd}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 35, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Create Account
        </Button>
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : accounts.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <Typography color="text.secondary">
            No officer accounts found.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: "bold" } }}>
                <TableCell>#</TableCell>
                <TableCell>Student Number</TableCell>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Date Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account, index) => (
                <TableRow key={account.officer_id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{account.student_number}</TableCell>
                  <TableCell>{account.first_name}</TableCell>
                  <TableCell>{account.last_name}</TableCell>
                  <TableCell>
                    {account.date_created
                      ? new Date(account.date_created).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell align="center">
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
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenAccountDelete(account)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
