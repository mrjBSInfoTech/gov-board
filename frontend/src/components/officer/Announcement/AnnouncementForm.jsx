import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Slide,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const IMAGE_BASE_URL = "http://localhost:5000/uploads/officer/uploadAnnouncement";

function AnnouncementForm({ open, handleClose, initialData, onSubmit, loading }) {
  const isEdit = Boolean(initialData?.announcement_id);

  const [announcementBody, setAnnouncementBody] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (initialData) {
        setAnnouncementBody(initialData.announcement_body || initialData.description || "");
        setLink(initialData.link || "");
        setFile(null);
        if (initialData.image) {
          setPreviewUrl(`${IMAGE_BASE_URL}/${initialData.image}`);
        } else {
          setPreviewUrl(null);
        }
      } else {
        // Reset form for new announcement
        setAnnouncementBody("");
        setLink("");
        setFile(null);
        setPreviewUrl(null);
      }
      setError("");
    }
  }, [open, initialData]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!announcementBody.trim()) {
      setError("Announcement content is required.");
      return;
    }

    const payload = {
      announcement_body: announcementBody.trim(),
      link: link.trim(),
      file,
    };

    onSubmit(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: "bold",
          m: 0,
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {isEdit ? "Edit Announcement" : "Add Announcement"}
        <IconButton onClick={handleClose} size="small" disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Announcement Message"
              variant="outlined"
              fullWidth
              required
              multiline
              rows={4}
              placeholder="What's on your mind? Enter announcement details..."
              value={announcementBody}
              onChange={(e) => setAnnouncementBody(e.target.value)}
              disabled={loading}
            />

            <TextField
              label="Link (Optional)"
              variant="outlined"
              fullWidth
              placeholder="https://example.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={loading}
            />

            {/* Image Upload Area */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Attach Image (Optional)
              </Typography>

              <Box
                component="label"
                htmlFor="announcement-image-input"
                sx={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  border: "2px dashed",
                  borderColor: previewUrl ? "primary.main" : "grey.300",
                  borderRadius: 2,
                  p: previewUrl ? 2 : 3,
                  textAlign: "center",
                  bgcolor: previewUrl ? "grey.50" : "grey.50",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "primary.50",
                  },
                }}
              >
                <input
                  id="announcement-image-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  disabled={loading}
                />

                {previewUrl ? (
                  <Box
                    sx={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      component="img"
                      src={previewUrl}
                      alt="Selected Preview"
                      sx={{
                        maxHeight: 220,
                        maxWidth: "100%",
                        borderRadius: 2,
                        objectFit: "cover",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Box
                      sx={{
                        mt: 1.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {file ? file.name : "Attached Image"}
                      </Typography>
                      <Tooltip title="Remove Image">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={handleRemoveImage}
                          sx={{ bgcolor: "error.50" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                    }}
                  >
                    <CloudUploadIcon color="primary" sx={{ fontSize: 44 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                      Click to browse image to attach
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supports JPG, PNG, GIF, WEBP
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={handleClose} color="inherit" variant="outlined" disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ fontWeight: "bold", px: 3 }}
          >
            {loading ? (isEdit ? "Updating..." : "Adding...") : isEdit ? "Save Changes" : "Post Announcement"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default AnnouncementForm;
