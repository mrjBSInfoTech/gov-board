import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AccountDelete({ open, handleClose, selectedAccount, onDelete }) {
  const handleConfirm = () => {
    if (selectedAccount?.officer_id) {
      onDelete(selectedAccount.officer_id);
    }
  };

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
        Delete Officer Account
      </DialogTitle>

      <DialogContent dividers>
        <Typography>
          Are you sure you want to delete the account of{" "}
          <strong>
            {selectedAccount?.first_name} {selectedAccount?.last_name}
          </strong>
          ? This action cannot be undone.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AccountDelete;
