import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

function RoomCard({ room, index, onEdit, onDelete, onCopy, copied }) {
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Room Name */}
        <Typography variant="subtitle1" fontWeight="bold" noWrap>
          {room.room_name}
        </Typography>

        {/* Room Code */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Code:
          </Typography>
          <Typography
            variant="caption"
            fontFamily="monos"
            fontWeight="bold"
            letterSpacing={1}
          >
            {room.room_number}
          </Typography>
          <Tooltip title={copied === room.room_id ? "Copied!" : "Copy"}>
            <IconButton
              size="small"
              onClick={() => onCopy(room.room_number, room.room_id)}
              sx={{ p: 0.3 }}
            >
              <ContentCopyIcon sx={{ fontSize: 13 }} color={copied === room.room_id ? "success" : "inherit"} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Date */}
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: "block" }}>
          {room.date_created
            ? new Date(room.date_created).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </Typography>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: "flex-end", py: 0.5, px: 1 }}>
        <Tooltip title="Edit">
          <IconButton size="small" color="primary" onClick={() => onEdit(room)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(room)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

export default RoomCard;
