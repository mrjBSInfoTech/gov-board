import React, { useState } from "react";
import { Card, Typography, IconButton, Box, Tooltip, Link as MuiLink } from "@mui/material";
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
        borderRadius: 4,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 10px 24px rgba(3, 10, 15, 0.18)",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 16px 32px rgba(3, 10, 15, 0.28)",
          borderColor: "primary.light",
        },
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
        {/* Header: Date and Actions */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}
          >
            {formatDate(announcement.date_created)}
          </Typography>

          {/* Action Buttons */}
          {(onEdit || onDelete) && (
            <Box sx={{ display: "flex", gap: 1 }}>
              {onEdit && (
                <Tooltip title="Edit Post">
                  <IconButton
                    size="small"
                    onClick={() => onEdit(announcement)}
                    sx={{
                      bgcolor: "action.hover",
                      color: "text.secondary",
                      border: "1px solid",
                      borderColor: "divider",
                      "&:hover": {
                        bgcolor: "rgba(45, 212, 191, 0.12)",
                        color: "primary.main",
                        borderColor: "primary.main",
                      },
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
                      bgcolor: "action.hover",
                      color: "text.secondary",
                      border: "1px solid",
                      borderColor: "divider",
                      "&:hover": { bgcolor: "error.50", color: "error.main", borderColor: "error.main" },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        {/* Body */}
        <Typography
          component="p"
          sx={{
            m: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#edf7f7",
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
            fontSize: "1rem",
            lineHeight: 1.65,
            fontWeight: 500,
            mb: imageUrl ? 3 : announcement.link ? 2 : 0,
          }}
        >
          {announcement.announcement_body}
        </Typography>

        {/* Link */}
        {announcement.link && (
          <MuiLink
            href={
              announcement.link.startsWith("http")
                ? announcement.link
                : `https://${announcement.link}`
            }
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              px: 3,
              py: 1,
              borderRadius: 8,
              bgcolor: "rgba(45, 212, 191, 0.12)",
              color: "primary.main",
              fontWeight: 600,
              fontSize: "0.875rem",
              mb: imageUrl ? 3 : 0,
              transition: "all 0.2s",
              wordBreak: "break-all",
              "&:hover": {
                bgcolor: "rgba(45, 212, 191, 0.2)",
              }
            }}
          >
            {announcement.link} <LaunchIcon sx={{ fontSize: 16, flexShrink: 0 }} />
          </MuiLink>
        )}

        {/* Image */}
        {imageUrl && (
          <Box sx={{ width: "100%", mt: 1 }}>
            <Box
              component="img"
              src={imageUrl}
              alt="Announcement Attachment"
              onError={() => setImageError(true)}
              sx={{
                width: "100%",
                maxHeight: 480,
                objectFit: "cover",
                borderRadius: 3,
                boxShadow: "0 4px 12px rgba(3, 10, 15, 0.18)",
              }}
            />
          </Box>
        )}
      </Box>
    </Card>
  );
}

export default AnnouncementCard;
