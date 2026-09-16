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

function StudentDelete({ open, handleClose, selectedStudent, onDelete }) {
  const handleConfirm = () => {
    if (selectedStudent?.student_id) {
      onDelete(selectedStudent.student_id);
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
        Delete Student Account
      </DialogTitle>

      <DialogContent dividers>
        <Typography>
          Are you sure you want to delete the account of{" "}
          <strong>
            {selectedStudent?.first_name} {selectedStudent?.last_name}
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

export default StudentDelete;
