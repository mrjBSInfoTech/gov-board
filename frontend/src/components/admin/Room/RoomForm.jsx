import React, { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Autocomplete,
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
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { fetchColleges } from "../../../api/admin/roomAPI";

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

function RoomForm({ open, handleClose, selectedRoom, onSubmit }) {
  const [form, setForm] = useState({
    room_number: "",
    room_name: "",
    description: "",
    all_colleges: true,
    colleges: [],
  });
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(false);
  const [collegesError, setCollegesError] = useState("");

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
          description: selectedRoom.description || "",
          all_colleges: Boolean(selectedRoom.all_colleges),
          colleges: selectedRoom.colleges || [],
        });
      } else {
        setForm({
          room_number: generateCode(),
          room_name: "",
          description: "",
          all_colleges: true,
          colleges: [],
        });
      }
      setErrors({});
      setCopied(false);

      let active = true;
      setCollegesLoading(true);
      setCollegesError("");
      fetchColleges()
        .then((availableColleges) => {
          if (active) setColleges(availableColleges);
        })
        .catch((error) => {
          if (active) setCollegesError(error.message || "Unable to load colleges.");
        })
        .finally(() => {
          if (active) setCollegesLoading(false);
        });
      return () => {
        active = false;
      };
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
    if (!form.description.trim()) {
      newErrors.description = "Room description is required";
    }
    if (!form.all_colleges && !form.colleges.length) {
      newErrors.colleges = "Select at least one college";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      if (event.target.closest(".MuiAutocomplete-root")) return;
      event.preventDefault();
      handleSubmit();
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
      description: form.description.trim(),
      all_colleges: form.all_colleges,
      colleges: form.colleges,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      onKeyDown={handleKeyDown}
      keepMounted
      PaperProps={{
        sx: {
          width: { xs: "calc(100vw - 32px)", sm: 520 },
          maxWidth: "100%",
          maxHeight: "calc(100% - 32px)",
          borderRadius: 3,
        },
      }}
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
          <TextField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            error={Boolean(errors.description)}
            helperText={errors.description || "What this room is for"}
            fullWidth
            size="small"
            multiline
            minRows={3}
            inputProps={{ maxLength: 2000 }}
          />
          <FormControl>
            <FormLabel id="room-college-audience-label">
              Which colleges should this room be available to?
            </FormLabel>
            <RadioGroup
              aria-labelledby="room-college-audience-label"
              value={form.all_colleges ? "all" : "specific"}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  all_colleges: event.target.value === "all",
                }))
              }
            >
              <FormControlLabel
                value="all"
                control={<Radio />}
                label="Every college"
              />
              <FormControlLabel
                value="specific"
                control={<Radio />}
                label="Specific colleges only"
              />
            </RadioGroup>
            <Typography variant="caption" color="text.secondary">
              Governors and College Heads from the selected colleges can view
              this room in the admin console. The room's assigned college
              retains access to manage it. College-specific posts and events
              also use this audience. Anyone with the room code can still join.
            </Typography>
            {!form.all_colleges && (
              <>
                {collegesError && <Alert severity="error">{collegesError}</Alert>}
                <Autocomplete
                  multiple
                  freeSolo
                  options={colleges}
                  value={form.colleges}
                  loading={collegesLoading}
                  onChange={(_event, value) =>
                    setForm((prev) => ({ ...prev, colleges: value }))
                  }
                  getOptionLabel={(option) => option}
                  isOptionEqualToValue={(option, value) =>
                    option.toLocaleLowerCase() === value.toLocaleLowerCase()
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Colleges"
                      placeholder="Type a college and press Enter"
                      error={Boolean(errors.colleges || collegesError)}
                      helperText={
                        errors.colleges ||
                        (collegesLoading
                          ? "Loading suggestions…"
                          : "Select a suggestion or type a college and press Enter. Use the same name as on member profiles.")
                      }
                    />
                  )}
                />
              </>
            )}
          </FormControl>
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
