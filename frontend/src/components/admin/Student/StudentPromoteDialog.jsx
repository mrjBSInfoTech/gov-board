import React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slide,
  Typography,
} from "@mui/material";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const POSITION_OPTIONS = [
  "Mayor",
  "Vice-Mayor",
  "Secretary",
  "Treasurer",
  "Auditor",
  "P.I.O.",
  "Protocol Officer",
];

function StudentPromoteDialog({
  open,
  handleClose,
  selectedStudent,
  selectedPosition,
  onPositionChange,
  onConfirm,
  error,
  requiresConfirmation = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: { minWidth: { xs: "90vw", sm: 420 }, borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>
        {requiresConfirmation
          ? "Confirm Promotion Replacement"
          : "Promote Student"}
      </DialogTitle>

      <DialogContent dividers sx={{ display: "grid", gap: 2 }}>
        {requiresConfirmation ? (
          <>
            <Typography>
              Are you sure you want to promote{" "}
              <strong>
                {selectedStudent?.first_name} {selectedStudent?.last_name}
              </strong>{" "}
              to <strong>{selectedPosition}</strong>?
            </Typography>
          </>
        ) : (
          <>
            <Typography>
              Promote{" "}
              <strong>
                {selectedStudent?.first_name} {selectedStudent?.last_name}
              </strong>{" "}
              to:
            </Typography>

            <FormControl fullWidth>
              <InputLabel id="student-position-label">Position</InputLabel>
              <Select
                labelId="student-position-label"
                value={selectedPosition}
                label="Position"
                onChange={(event) => onPositionChange(event.target.value)}
              >
                {POSITION_OPTIONS.map((position) => (
                  <MenuItem key={position} value={position}>
                    {position}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="success"
          variant="contained"
          disabled={!selectedPosition}
        >
          {requiresConfirmation ? "Confirm Replacement" : "Confirm Promotion"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StudentPromoteDialog;
