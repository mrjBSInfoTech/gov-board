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

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function RoomDelete({ open, handleClose, selectedRoom, onDelete }) {
  const handleConfirm = () => {
    if (selectedRoom?.room_id) {
      onDelete(selectedRoom.room_id);
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
      <DialogTitle
        sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}
      >
        <WarningAmberIcon color="error" />
        Delete Room
      </DialogTitle>

      <DialogContent dividers>
        <Typography>
          Are you sure you want to delete{" "}
          <strong>
            Room {selectedRoom?.room_number} — {selectedRoom?.room_name}
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

export default RoomDelete;
