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
import PersonRemoveAlt1Icon from "@mui/icons-material/PersonRemoveAlt1";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AccountDemote({ open, handleClose, selectedAccount, onConfirm }) {
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
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontWeight: "bold",
        }}
      >
        <PersonRemoveAlt1Icon color="warning" />
        Demote Official
      </DialogTitle>

      <DialogContent dividers>
        <Typography>
          Are you sure you want to demote{" "}
          <strong>
            {selectedAccount?.first_name} {selectedAccount?.last_name}
          </strong>{" "}
          from officer to student? Their officer authority will be removed.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="warning" variant="contained">
          Demote
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AccountDemote;
