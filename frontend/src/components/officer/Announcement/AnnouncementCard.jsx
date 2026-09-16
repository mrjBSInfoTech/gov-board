import React, { useState } from "react";
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Box,
  Tooltip,
  Link as MuiLink,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LaunchIcon from "@mui/icons-material/Launch";

const IMAGE_BASE_URL = "http://localhost:5000/uploads/officer/uploadAnnouncement";

function AnnouncementCard({ announcement, onEdit, onDelete }) {
  const [imageError, setImageError] = useState(false);

  if (!announcement) return null;

  const imageUrl =
    announcement.image && !imageError
      ? `${IMAGE_BASE_URL}/${announcement.image}`
      : null;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2.5,
        bgcolor: "#ffffff",
        border: "1px solid #e4e6eb",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
        transition: "box-shadow 0.2s ease-in-out",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
        },
        overflow: "hidden",
      }}
    >
      {/* Facebook Card Top Header: Post Date & Action Buttons */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          pt: 2,
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, fontSize: "0.825rem" }}
          >
            Date Published: {formatDate(announcement.date_created)}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {onEdit && (
            <Tooltip title="Edit Post">
              <IconButton
                size="small"
                onClick={() => onEdit(announcement)}
                sx={{
                  color: "text.secondary",
                  "&:hover": { bgcolor: "#f0f2f5", color: "primary.main" },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete Post">
              <IconButton
                size="small"
                onClick={() => onDelete(announcement)}
                sx={{
                  color: "text.secondary",
                  "&:hover": { bgcolor: "#fde8e8", color: "error.main" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Post Text Content (Displayed BEFORE image, just like Facebook) */}
      <Box sx={{ px: 2.5, py: 1 }}>
        <Typography
          variant="body1"
          sx={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#050505",
            fontSize: "0.95rem",
            lineHeight: 1.5,
            fontWeight: 400,
          }}
        >
          {announcement.announcement_body}
        </Typography>

        {/* Optional Link Preview */}
        {announcement.link && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: "#f0f2f5",
              border: "1px solid #e4e6eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <MuiLink
              href={
                announcement.link.startsWith("http")
                  ? announcement.link
                  : `https://${announcement.link}`
              }
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{
                fontWeight: 600,
                fontSize: "0.85rem",
                color: "#1877f2",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                wordBreak: "break-all",
              }}
            >
              {announcement.link} <LaunchIcon sx={{ fontSize: 14 }} />
            </MuiLink>
          </Box>
        )}
      </Box>

      {/* Post Attached Media (Only rendered if an image exists) */}
      {imageUrl && (
        <Box sx={{ mt: 1, width: "100%", bgcolor: "#f0f2f5" }}>
          <CardMedia
            component="img"
            image={imageUrl}
            alt="Announcement Attachment"
            onError={() => setImageError(true)}
            sx={{
              width: "100%",
              maxHeight: 480,
              objectFit: "cover",
              display: "block",
            }}
          />
        </Box>
      )}
    </Card>
  );
}

export default AnnouncementCard;
