import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

// Generate a Google Classroom-style room code (e.g. "abc-1x2y")
const generateCode = () => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const alphanumeric = "abcdefghijklmnopqrstuvwxyz0123456789";
  const part1 = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("");
  const part2 = Array.from({ length: 4 }, () =>
    alphanumeric[Math.floor(Math.random() * alphanumeric.length)]
  ).join("");
  return `${part1}-${part2}`;
};

const emptyForm = { room_number: "", room_name: "" };

function RoomForm({ open, handleClose, selectedRoom, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);

  const isEdit = Boolean(selectedRoom);

  const refreshCode = useCallback(() => {
    setForm((prev) => ({ ...prev, room_number: generateCode() }));
  }, []);

  useEffect(() => {
    if (open) {
      if (selectedRoom) {
        setForm({
          room_number: selectedRoom.room_number || generateCode(),
          room_name: selectedRoom.room_name || "",
        });
      } else {
        setForm({ room_number: generateCode(), room_name: "" });
      }
      setErrors({});
      setCopied(false);
    }
  }, [open, selectedRoom]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(form.room_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.room_name.trim()) newErrors.room_name = "Room name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleVerify();
    }

    if (event.key === "Escape") {
      handleClose();
    }
  };


  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      room_number: form.room_number,
      room_name: form.room_name.trim(),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      onKeyDown={handleKeyDown}
      keepMounted
      PaperProps={{ sx: { minWidth: "420px", borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>
        {isEdit ? "Edit Room" : "Add Room"}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>

          {/* Room Code — auto-generated, read-only */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5, display: "block" }}
            >
              Room Code
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                letterSpacing={3}
                sx={{ flexGrow: 1, fontFamily: "monospace", color: "error.main" }}
              >
                {form.room_number}
              </Typography>
              <Tooltip title={copied ? "Copied!" : "Copy code"}>
                <IconButton size="small" onClick={handleCopy}>
                  <ContentCopyIcon fontSize="small" color={copied ? "success" : "inherit"} />
                </IconButton>
              </Tooltip>
              {!isEdit && (
                <Tooltip title="Generate new code">
                  <IconButton size="small" onClick={refreshCode}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Share this code with students to join the room.
            </Typography>
          </Box>

          {/* Room Name */}
          <TextField
            label="Room Name"
            name="room_name"
            value={form.room_name}
            onChange={handleChange}
            error={Boolean(errors.room_name)}
            helperText={errors.room_name || "e.g. Mathematics 101, Science Lab"}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MeetingRoomIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="error" variant="contained">
          {isEdit ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RoomForm;
