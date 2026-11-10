import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import {
  decideRoomJoinRequest,
  fetchRoomJoinRequests,
} from "../../api/roomAPI";

export default function RoomJoinRequestsDialog({ open, onClose, roomId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !roomId) return undefined;

    let active = true;
    setLoading(true);
    setError("");
    fetchRoomJoinRequests(roomId)
      .then((data) => {
        if (active) setRequests(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load join requests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, roomId]);

  const handleDecision = async (request, decision) => {
    setSavingId(request.join_request_id);
    setError("");
    try {
      await decideRoomJoinRequest(roomId, request.join_request_id, decision);
      setRequests((current) =>
        current.filter(
          (item) => item.join_request_id !== request.join_request_id,
        ),
      );
    } catch (decisionError) {
      setError(decisionError.message || "Unable to update join request.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 700,
        }}
      >
        Join Requests
        <IconButton onClick={onClose} aria-label="Close join requests">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : requests.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            No pending join requests for this room.
          </Typography>
        ) : (
          <List disablePadding>
            {requests.map((request, index) => {
              const isSaving = savingId === request.join_request_id;
              return (
                <Box key={request.join_request_id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    disableGutters
                    secondaryAction={
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          color="inherit"
                          disabled={savingId !== null}
                          onClick={() => handleDecision(request, "reject")}
                        >
                          Decline
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={savingId !== null}
                          onClick={() => handleDecision(request, "approve")}
                        >
                          {isSaving ? <CircularProgress size={18} /> : "Approve"}
                        </Button>
                      </Box>
                    }
                    sx={{ pr: 19, py: 1.5 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "primary.main" }}>
                        {request.first_name?.[0] || <PersonIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${request.first_name} ${request.last_name}`}
                      secondary={request.section
                        ? `Section ${request.section}`
                        : "Room access requested"}
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
