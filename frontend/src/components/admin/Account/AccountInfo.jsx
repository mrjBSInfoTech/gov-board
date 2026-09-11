import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  Stack,
} from "@mui/material";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AccountInfo({ open, handleClose, selectedAccount }) {
  const [officer, setOfficer] = useState(null);

  useEffect(() => {
    if (selectedAccount) {
      setOfficer(selectedAccount);
    } else {
      setOfficer(null);
    }
  }, [selectedAccount, open]);

  function capitalize(text) {
    if (!text) return "";
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{ sx: { minWidth: "350px" } }}
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>Officer Information</DialogTitle>

      <DialogContent dividers>
        {officer && (
          <Stack spacing={1.5}>
            <Typography variant="body2">
              <strong>Name:</strong> {officer.first_name} {officer.last_name}
            </Typography>
            <Typography variant="body2">
              <strong>Role:</strong> {capitalize(officer.role)}
            </Typography>
            <Typography variant="body2">
              <strong>Can Add:</strong> {officer.can_add ? "Yes" : "No"}
            </Typography>
            <Typography variant="body2">
              <strong>Can Edit:</strong> {officer.can_edit ? "Yes" : "No"}
            </Typography>
            <Typography variant="body2">
              <strong>Can Delete:</strong> {officer.can_delete ? "Yes" : "No"}
            </Typography>
            <Typography variant="body2">
              <strong>Can Moderate:</strong> {officer.can_moderate ? "Yes" : "No"}
            </Typography>
            <Typography variant="body2">
              <strong>Date Created:</strong> {formatDate(officer.date_created)}
            </Typography>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AccountInfo;
