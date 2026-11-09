import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import PeopleCardList from "../../components/common/PeopleCardList";
import AdminForm from "../../components/admin/Account/AdminForm";
import {
  addAdminAccount,
  deleteAdminAccount,
  fetchAdminAccounts,
  updateAdminAccount,
  updateGovernorStudentEditPermission,
} from "../../api/admin/accountAPI";

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingPermissionIds, setPendingPermissionIds] = useState([]);
  const isSuperAdmin =
    localStorage.getItem("admin_id") === "1" &&
    localStorage.getItem("admin_position") === "Super Admin";
  const isCollegeHead = localStorage.getItem("admin_position") === "College Head";

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      setAdmins(await fetchAdminAccounts());
    } catch (error) {
      setErrorMessage(error.message || "Unable to load admins.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const filteredAdmins = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return admins.filter((admin) =>
      `${admin.first_name} ${admin.last_name} ${admin.username} ${admin.position} ${admin.college || ""}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [admins, searchTerm]);

  const handleSaveAdmin = async (formData) => {
    if (selectedAdmin) {
      await updateAdminAccount(selectedAdmin.admin_id, formData);
      setNotice("Admin account updated.");
    } else {
      await addAdminAccount(formData);
      setNotice("Admin account created.");
    }
    setFormOpen(false);
    setSelectedAdmin(null);
    await loadAdmins();
  };

  const handleToggleGovernorPermission = async (admin, enabled) => {
    setPendingPermissionIds((current) => [...current, admin.admin_id]);
    setErrorMessage("");
    try {
      await updateGovernorStudentEditPermission(admin.admin_id, enabled);
      setAdmins((current) =>
        current.map((item) =>
          item.admin_id === admin.admin_id
            ? { ...item, can_edit_students: enabled }
            : item,
        ),
      );
      setNotice(
        enabled
          ? "Governor can now edit student details."
          : "Governor student-edit permission revoked.",
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to update Governor permission.");
    } finally {
      setPendingPermissionIds((current) =>
        current.filter((id) => id !== admin.admin_id),
      );
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAdminAccount(deleteTarget.admin_id);
      setDeleteTarget(null);
      setNotice("Admin account deleted.");
      await loadAdmins();
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete admin account.");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Admins</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          Admins
        </Typography>
        {isSuperAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedAdmin(null);
              setFormOpen(true);
            }}
          >
            Add Admin
          </Button>
        )}
      </Box>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {isSuperAdmin
          ? "Manage Governor and College Head accounts across all colleges."
          : isCollegeHead
            ? "View admins in your college and grant or revoke your Governor's student-edit permission."
            : "View admins assigned to your college."}
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage("")}>
          {errorMessage}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      {!loading && (
        <TextField
          fullWidth
          size="small"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search admins by name, username, position, or college"
          sx={{ maxWidth: { sm: 480 }, mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <PeopleCardList
          items={filteredAdmins}
          rowKey={(admin) => admin.admin_id}
          emptyMessage="No admins found."
          columns={[
            { label: "Username", key: "username" },
            { label: "Position", key: "position" },
            { label: "College", key: "college" },
            { label: "First Name", key: "first_name" },
            { label: "Last Name", key: "last_name" },
            {
              label: "Governor student edits",
              render: (admin) =>
                admin.position === "Governor" ? (
                  <FormControlLabel
                    label={admin.can_edit_students ? "Allowed" : "Not allowed"}
                    control={
                      <Switch
                        checked={Boolean(admin.can_edit_students)}
                        onChange={(event) =>
                          handleToggleGovernorPermission(
                            admin,
                            event.target.checked,
                          )
                        }
                        disabled={
                          pendingPermissionIds.includes(admin.admin_id) ||
                          !(isSuperAdmin || isCollegeHead)
                        }
                        inputProps={{
                          "aria-label": `Allow ${admin.first_name} ${admin.last_name} to edit student details`,
                        }}
                      />
                    }
                  />
                ) : (
                  "—"
                ),
            },
            {
              label: "Date Created",
              render: (admin) =>
                admin.date_created
                  ? new Date(admin.date_created).toLocaleDateString()
                  : "—",
            },
          ]}
          renderActions={
            isSuperAdmin
              ? (admin) => (
                  <>
                    <Tooltip title="Edit admin">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setFormOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {Number(admin.admin_id) !== 1 && (
                      <Tooltip title="Delete admin">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(admin)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                )
              : undefined
          }
        />
      )}

      <AdminForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedAdmin(null);
        }}
        selectedAdmin={selectedAdmin}
        onSubmit={handleSaveAdmin}
      />
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>Delete Admin Account</DialogTitle>
        <DialogContent>
          <Typography>
            Delete the admin account for {deleteTarget?.first_name}{" "}
            {deleteTarget?.last_name}? They will no longer be able to sign in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" onClick={handleDeleteAdmin}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
