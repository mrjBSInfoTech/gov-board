import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  CircularProgress,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AnnouncementDelete({ open, handleClose, selectedAnnouncement, onDelete, loading }) {
  const handleConfirm = () => {
    if (selectedAnnouncement?.announcement_id) {
      onDelete(selectedAnnouncement.announcement_id);
    }
  };

  const bodySnippet = selectedAnnouncement?.announcement_body
    ? selectedAnnouncement.announcement_body.length > 50
      ? selectedAnnouncement.announcement_body.substring(0, 50) + "..."
      : selectedAnnouncement.announcement_body
    : "";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{ sx: { minWidth: "380px", borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
        <WarningAmberIcon color="error" />
        Delete Announcement
      </DialogTitle>

      <DialogContent dividers>
        <Typography>
          Are you sure you want to delete this announcement
          {bodySnippet ? (
            <>
              {" "}
              (<strong>"{bodySnippet}"</strong>)
            </>
          ) : null}
          ? This action cannot be undone.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AnnouncementDelete;
