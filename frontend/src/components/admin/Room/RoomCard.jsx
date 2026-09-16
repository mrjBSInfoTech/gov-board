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
import { useNavigate } from "react-router-dom";

function RoomCard({ room, index, onEdit, onDelete, onCopy, copied }) {
  const navigate = useNavigate();

  return (
    <Card
      variant="outlined"
      onClick={() => navigate(`/admin/room/${room.room_id}`)}
      sx={{
        borderRadius: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
      }}
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
              onClick={(event) => {
                event.stopPropagation();
                onCopy(room.room_number, room.room_id);
              }}
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
          <IconButton
            size="small"
            color="primary"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(room);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(room);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

export default RoomCard;
