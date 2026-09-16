import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  InputAdornment,
  Paper,
  Snackbar,
  TextField,
  Typography,
  Slide,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CampaignIcon from "@mui/icons-material/Campaign";

import AnnouncementCard from "../../components/officer/Announcement/AnnouncementCard";
import AnnouncementForm from "../../components/officer/Announcement/AnnouncementForm";
import AnnouncementDelete from "../../components/officer/Announcement/AnnouncementDelete";

import {
  fetchAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../../api/officer/announcementAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Action loading states
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Snackbar notification
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Fetch announcements list
  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Error loading announcements:", err);
      setError(err.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Handlers for Form
  const handleOpenAddForm = () => {
    setSelectedAnnouncement(null);
    setFormOpen(true);
  };

  const handleOpenEditForm = (announcement) => {
    setSelectedAnnouncement(announcement);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (!formLoading) {
      setFormOpen(false);
      setSelectedAnnouncement(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      if (selectedAnnouncement?.announcement_id) {
        await updateAnnouncement(selectedAnnouncement.announcement_id, formData);
        showSnackbar("Announcement updated successfully!", "success");
      } else {
        await addAnnouncement(formData);
        showSnackbar("Announcement created successfully!", "success");
      }
      handleCloseForm();
      await loadAnnouncements();
    } catch (err) {
      console.error("Form submit error:", err);
      showSnackbar(err.message || "Failed to save announcement", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Handlers for Delete
  const handleOpenDeleteDialog = (announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    if (!deleteLoading) {
      setDeleteOpen(false);
      setSelectedAnnouncement(null);
    }
  };

  const handleDeleteConfirm = async (id) => {
    setDeleteLoading(true);
    try {
      await deleteAnnouncement(id);
      showSnackbar("Announcement deleted successfully!", "success");
      handleCloseDeleteDialog();
      await loadAnnouncements();
    } catch (err) {
      console.error("Delete error:", err);
      showSnackbar(err.message || "Failed to delete announcement", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter announcements based on search term
  const filteredAnnouncements = announcements.filter((item) => {
    const term = searchTerm.toLowerCase();
    const bodyMatch = (item.announcement_body || "").toLowerCase().includes(term);
    const linkMatch = (item.link || "").toLowerCase().includes(term);
    return bodyMatch || linkMatch;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Announcements</title>
      </Helmet>

      {/* Header section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
          >
            Announcements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and post announcements for students and members
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddForm}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: "bold",
            textTransform: "none",
            boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
          }}
        >
          Add Announcement
        </Button>
      </Box>

      {/* Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: "1px solid rgba(0, 0, 0, 0.08)",
          bgcolor: "background.paper",
        }}
      >
        <TextField
          fullWidth
          placeholder="Search announcements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          size="small"
        />
      </Paper>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
          }}
        >
          <CircularProgress />
        </Box>
      ) : filteredAnnouncements.length === 0 ? (
        /* Empty state */
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: "1px dashed rgba(0, 0, 0, 0.15)",
            bgcolor: "grey.50",
          }}
        >
          <CampaignIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? "No announcements found matching your search" : "No announcements available"}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {searchTerm
              ? "Try adjusting your search query."
              : "Click the button below to create your first announcement."}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddForm}
            >
              Add Announcement
            </Button>
          )}
        </Paper>
      ) : (
        /* Grid of Announcements */
        <Grid container spacing={3}>
          {filteredAnnouncements.map((announcement) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={announcement.announcement_id}
            >
              <AnnouncementCard
                announcement={announcement}
                onEdit={handleOpenEditForm}
                onDelete={handleOpenDeleteDialog}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal Dialogs */}
      <AnnouncementForm
        open={formOpen}
        handleClose={handleCloseForm}
        initialData={selectedAnnouncement}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />

      <AnnouncementDelete
        open={deleteOpen}
        handleClose={handleCloseDeleteDialog}
        selectedAnnouncement={selectedAnnouncement}
        onDelete={handleDeleteConfirm}
        loading={deleteLoading}
      />

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
