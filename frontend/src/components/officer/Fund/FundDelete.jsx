import React from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function FundDelete({ open, handleClose, selectedFund, onDelete, loading }) {
  const handleConfirm = () => {
    if (selectedFund?.fund_id) onDelete(selectedFund.fund_id);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{ sx: { minWidth: 380, borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: "bold" }}>
        <WarningAmberIcon color="error" />
        Delete Fund
      </DialogTitle>
      <DialogContent dividers>
        <Typography>
          Delete {selectedFund?.fund_name ? `“${selectedFund.fund_name}”` : "this fund"}? This action cannot be undone.
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

export default FundDelete;
