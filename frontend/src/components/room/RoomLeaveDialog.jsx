import React from "react";
import {
  Button,
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

export default function RoomLeaveDialog({ open, onClose, onConfirm, loading = false }) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{ sx: { minWidth: "380px", borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}
      >
        <WarningAmberIcon color="warning" />
        Leave Room
      </DialogTitle>
      <DialogContent dividers>
        <Typography>
          Are you sure you want to leave this room? You will need to join again
          to access its announcements and members.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {loading ? "Leaving..." : "Leave Room"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
