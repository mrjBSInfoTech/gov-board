import { useId, useState } from "react";
import {
  Box,
  ButtonBase,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link as MuiLink,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LaunchIcon from "@mui/icons-material/Launch";
import { API_BASE_URL } from "../../../api/apiBaseURL";
import { getAnnouncementImages } from "../../../utils/announcementImages";
import {
  formatAnnouncementBodyHtml,
  stripAnnouncementHtml,
} from "../../../utils/announcementFormat";

function AnnouncementCard({ announcement, onEdit, onDelete }) {
  const dialogTitleId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  if (!announcement) return null;

  const imageNames = getAnnouncementImages(announcement);
  const imageBaseUrl =
    announcement.source_type === "governance"
      ? `${API_BASE_URL}/uploads/admin/governanceAnnouncement`
      : `${API_BASE_URL}/uploads/officer/uploadAnnouncement`;

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
  const announcementLink = announcement.link
    ? announcement.link.startsWith("http")
      ? announcement.link
      : `https://${announcement.link}`
    : null;
  const plainBody = stripAnnouncementHtml(announcement.announcement_body);
  const formattedBodyHtml = formatAnnouncementBodyHtml(announcement.announcement_body);
  const announcementPreview =
    announcement.title?.trim() ||
    plainBody.replace(/\s+/g, " ").trim().slice(0, 80) ||
    "Announcement details";
  const closeDetails = () => {
    setDetailsOpen(false);
    setPreviewImage(null);
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
        cursor: "pointer",
      }}
    >
      <ButtonBase
        aria-label={`Open announcement: ${announcementPreview}`}
        onClick={() => setDetailsOpen(true)}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          borderRadius: 4,
          "&.Mui-focusVisible": {
            outline: "3px solid",
            outlineColor: "primary.main",
            outlineOffset: -3,
          },
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          p: { xs: 2.5, sm: 3 },
          pointerEvents: "none",
        }}
      >
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
            <Box sx={{ display: "flex", gap: 1, pointerEvents: "auto" }}>
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

        {/* Title */}
        {announcement.title && (
          <Typography
            component="h3"
            variant="h6"
            sx={{
              m: 0,
              mb: 1,
              fontWeight: 700,
              color: "text.primary",
              wordBreak: "break-word",
            }}
          >
            {announcement.title}
          </Typography>
        )}

        {/* Body */}
        <Box
          sx={{
            m: 0,
            wordBreak: "break-word",
            color: "text.primary",
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
            fontSize: "1rem",
            lineHeight: 1.65,
            fontWeight: 400,
            mb: imageNames.length ? 3 : announcement.link ? 2 : 0,
            "& p": { m: 0, mb: 1 },
            "& p:last-child": { mb: 0 },
            "& ul, & ol": { pl: 3, my: 0.75 },
          }}
          dangerouslySetInnerHTML={{ __html: formattedBodyHtml }}
        />

        {/* Link */}
        {announcement.link && (
          <MuiLink
            href={announcementLink}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            sx={{
              display: "inline-flex",
              pointerEvents: "auto",
              alignItems: "center",
              gap: 1,
              px: 3,
              py: 1,
              borderRadius: 8,
              bgcolor: "rgba(45, 212, 191, 0.12)",
              color: "primary.main",
              fontWeight: 600,
              fontSize: "0.875rem",
              mb: imageNames.length ? 3 : 0,
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
        {imageNames.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 1.5,
              mt: 1,
            }}
          >
            {imageNames.map((image) => (
              <Box
                key={image}
                component="img"
                src={`${imageBaseUrl}/${encodeURIComponent(image)}`}
                alt="Announcement attachment"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                sx={{
                  width: "100%",
                  maxHeight: 480,
                  minHeight: 120,
                  objectFit: "cover",
                  borderRadius: 3,
                  boxShadow: "0 4px 12px rgba(3, 10, 15, 0.18)",
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      <Dialog
        open={detailsOpen}
        onClose={closeDetails}
        fullWidth={!previewImage}
        maxWidth={previewImage ? false : "md"}
        fullScreen={Boolean(previewImage)}
        aria-labelledby={dialogTitleId}
        PaperProps={{ sx: { borderRadius: previewImage ? 0 : 3 } }}
      >
        {previewImage ? (
          <>
            <DialogTitle
              id={dialogTitleId}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <ButtonBase
                onClick={() => setPreviewImage(null)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  minHeight: 44,
                  borderRadius: 1,
                  px: 1,
                  "&:focus-visible": {
                    outline: "3px solid",
                    outlineColor: "primary.main",
                  },
                }}
              >
                <ArrowBackIcon />
                <Typography component="span" fontWeight={600}>
                  Back to announcement
                </Typography>
              </ButtonBase>
              <IconButton onClick={closeDetails} aria-label="Close announcement">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent
              sx={{
                display: "grid",
                placeItems: "center",
                minHeight: 0,
                p: { xs: 1, sm: 3 },
                bgcolor: "background.default",
              }}
            >
              <Box
                component="img"
                src={previewImage.url}
                alt={previewImage.name}
                sx={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "calc(100dvh - 100px)",
                  objectFit: "contain",
                }}
              />
            </DialogContent>
          </>
        ) : (
          <>
            <DialogTitle
              id={dialogTitleId}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography component="h2" variant="h6" fontWeight={700} color="text.primary">
                  {announcement.title || "Announcement"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(announcement.date_created)}
                </Typography>
              </Box>
              <IconButton onClick={closeDetails} aria-label="Close announcement">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box
                sx={{
                  m: 0,
                  overflowWrap: "anywhere",
                  lineHeight: 1.7,
                  color: "text.primary",
                  "& p": { m: 0, mb: 1 },
                  "& p:last-child": { mb: 0 },
                  "& ul, & ol": { pl: 3, my: 0.75 },
                }}
                dangerouslySetInnerHTML={{ __html: formattedBodyHtml }}
              />

              {announcementLink && (
                <MuiLink
                  href={announcementLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    mt: 2,
                    overflowWrap: "anywhere",
                  }}
                >
                  {announcement.link}
                  <LaunchIcon fontSize="small" />
                </MuiLink>
              )}

              {imageNames.length > 0 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 2,
                    mt: 3,
                  }}
                >
                  {imageNames.map((image, index) => {
                    const imageUrl = `${imageBaseUrl}/${encodeURIComponent(image)}`;
                    const imageName = `Announcement image ${index + 1}`;
                    return (
                      <ButtonBase
                        key={image}
                        aria-label={`View ${imageName}`}
                        onClick={() =>
                          setPreviewImage({ url: imageUrl, name: imageName })
                        }
                        sx={{
                          width: "100%",
                          minHeight: 44,
                          aspectRatio: "4 / 3",
                          overflow: "hidden",
                          borderRadius: 2,
                          bgcolor: "action.hover",
                          "&:focus-visible": {
                            outline: "3px solid",
                            outlineColor: "primary.main",
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={imageName}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          sx={{
                            display: "block",
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </ButtonBase>
                    );
                  })}
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Card>
  );
}

export default AnnouncementCard;
