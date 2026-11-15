import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BackupOutlinedIcon from "@mui/icons-material/BackupOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import {
  exportSystemBackup,
  importSystemBackup,
} from "../../api/admin/systemBackupAPI";

export default function Settings() {
  const [passwordDialogAction, setPasswordDialogAction] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [backupFile, setBackupFile] = useState(null);
  const [importConfirmationOpen, setImportConfirmationOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState(null);
  const fileInputRef = useRef(null);
  const isSuperAdmin =
    localStorage.getItem("admin_id") === "1" &&
    localStorage.getItem("admin_position") === "Super Admin";

  const openPasswordPrompt = (action) => {
    setPasswordInput("");
    setPasswordDialogAction(action);
  };

  const closePasswordPrompt = () => {
    setPasswordInput("");
    setPasswordDialogAction("");
  };

  const handleExport = async (password) => {
    setBusy("export");
    setFeedback(null);
    try {
      const response = await exportSystemBackup(password);
      const contentDisposition = response.headers["content-disposition"] || "";
      const filename =
        contentDisposition.match(/filename="([^"]+)"/)?.[1] ||
        "gov-board-backup.zip";
      const downloadUrl = URL.createObjectURL(response.data);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setFeedback({ severity: "success", message: "Backup exported." });
    } catch (error) {
      setFeedback({ severity: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    const action = passwordDialogAction;
    const password = passwordInput;
    closePasswordPrompt();

    if (action === "export") {
      void handleExport(password);
      return;
    }

    if (action === "import") {
      setImportPassword(password);
      setImportConfirmationOpen(true);
    }
  };

  const handleImport = async () => {
    if (!backupFile) {
      setFeedback({ severity: "error", message: "Select a backup ZIP file first." });
      setImportConfirmationOpen(false);
      return;
    }

    setBusy("import");
    setImportConfirmationOpen(false);
    setFeedback(null);
    try {
      const result = await importSystemBackup(backupFile, importPassword);
      setBackupFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFeedback({ severity: "success", message: result.message });
    } catch (error) {
      setFeedback({ severity: "error", message: error.message });
    } finally {
      setImportPassword("");
      setBusy("");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Settings</title>
      </Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 }, mb: 1 }}
        >
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure administrative preferences and system options.
        </Typography>
      </Box>

      {!isSuperAdmin ? (
        <Alert severity="info">
          System backup and restore are available to the Super Admin only.
        </Alert>
      ) : (
        <Stack spacing={3}>
          {feedback && (
            <Alert severity={feedback.severity}>{feedback.message}</Alert>
          )}

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <BackupOutlinedIcon color="primary" />
                <Typography variant="h6">System backup</Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Export system records and uploaded files to a ZIP backup that
                can be imported later. Backup files contain sensitive account
                and system data, so store them securely.
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: { xs: "stretch", sm: "flex-start" },
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <Button
                  type="button"
                  onClick={() => openPasswordPrompt("export")}
                  variant="contained"
                  startIcon={
                    busy === "export" ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <FileDownloadOutlinedIcon />
                    )
                  }
                  disabled={Boolean(busy)}
                  sx={{ minHeight: 56, whiteSpace: "nowrap" }}
                >
                  Export backup
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <FileUploadOutlinedIcon color="primary" />
                <Typography variant="h6">Restore from backup</Typography>
              </Stack>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Import replaces all current system records and uploaded files.
                This cannot be undone. Only import a backup you trust.
              </Alert>

              <Stack
                spacing={2}
                sx={{ maxWidth: 520 }}
              >
                <Button
                  component="label"
                  variant="outlined"
                  disabled={Boolean(busy)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Choose backup ZIP
                  <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(event) =>
                      setBackupFile(event.target.files?.[0] || null)
                    }
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {backupFile
                    ? backupFile.name
                    : "No backup file selected. ZIP files up to 2 GB are supported."}
                </Typography>
                <Button
                  type="button"
                  onClick={() => openPasswordPrompt("import")}
                  variant="contained"
                  color="warning"
                  disabled={Boolean(busy) || !backupFile}
                  startIcon={
                    busy === "import" ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <FileUploadOutlinedIcon />
                    )
                  }
                  sx={{ alignSelf: "flex-start" }}
                >
                  Import and replace system data
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Dialog
        open={Boolean(passwordDialogAction)}
        onClose={closePasswordPrompt}
      >
        <Box component="form" onSubmit={handlePasswordSubmit}>
          <DialogTitle>
            Confirm password to {passwordDialogAction} backup
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Enter your admin password to continue.
              {passwordDialogAction === "import" &&
                " You will confirm replacing the current system data next."}
            </DialogContentText>
            <TextField
              autoFocus
              fullWidth
              label="Admin password"
              type="password"
              autoComplete="current-password"
              required
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={closePasswordPrompt}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Continue
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={importConfirmationOpen}
        onClose={() => {
          setImportConfirmationOpen(false);
          setImportPassword("");
        }}
      >
        <DialogTitle>Replace current system data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will replace the current database records and uploaded files
            with the selected backup. Continue only if you are sure.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportConfirmationOpen(false);
              setImportPassword("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            color="warning"
            disabled={Boolean(busy)}
          >
            Continue restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
