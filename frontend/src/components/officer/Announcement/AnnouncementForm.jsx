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
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { API_BASE_URL } from "../../../api/apiBaseURL";
import { getAnnouncementImages } from "../../../utils/announcementImages";
import { stripAnnouncementHtml } from "../../../utils/announcementFormat";
import RichTextEditor from "../../common/RichTextEditor";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const IMAGE_BASE_URL = `${API_BASE_URL}/uploads/officer/uploadAnnouncement`;

function AnnouncementForm({ open, handleClose, initialData, onSubmit, loading }) {
  const isEdit = Boolean(initialData?.announcement_id);

  const [title, setTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [sendUpdateEmail, setSendUpdateEmail] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title || "");
        setAnnouncementBody(initialData.announcement_body || initialData.description || "");
        setLink(initialData.link || "");
        setFiles([]);
      } else {
        setTitle("");
        setAnnouncementBody("");
        setLink("");
        setFiles([]);
      }
      setSendUpdateEmail(false);
      setError("");
    }
  }, [open, initialData]);

  useEffect(() => {
    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setFilePreviews(previews);
    return () => previews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [files]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((currentFiles) => [...currentFiles, ...selectedFiles]);
    e.target.value = "";
  };

  const handleRemoveImage = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    setFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!stripAnnouncementHtml(announcementBody)) {
      setError("Announcement content is required.");
      return;
    }

    const payload = {
      title: title.trim(),
      announcement_body: announcementBody.trim(),
      link: link.trim(),
      files,
      ...(isEdit ? { send_update_email: sendUpdateEmail } : {}),
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
              label="Title / Subject (Optional)"
              variant="outlined"
              fullWidth
              placeholder="e.g. Midterm Schedule Reminder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              inputProps={{ maxLength: 200 }}
            />

            <RichTextEditor
              label="Announcement Message"
              value={announcementBody}
              onChange={setAnnouncementBody}
              placeholder="Write your announcement details..."
              disabled={loading}
              required
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

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Attach Photos (Optional)
              </Typography>

              <Box
                component="label"
                htmlFor="announcement-images-input"
                sx={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  border: "2px dashed",
                  borderColor: "grey.300",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  bgcolor: "grey.50",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "primary.50",
                  },
                }}
              >
                <input
                  id="announcement-images-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <CloudUploadIcon color="primary" sx={{ fontSize: 40 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  Click to choose one or more photos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  JPG, PNG, GIF, WEBP; up to 10 MB per photo
                </Typography>
              </Box>
              {(getAnnouncementImages(initialData).length > 0 ||
                filePreviews.length > 0) && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    gap: 1,
                    mt: 1.5,
                  }}
                >
                  {getAnnouncementImages(initialData).map((image) => (
                    <Box key={`saved-${image}`}>
                      <Box
                        component="img"
                        src={`${IMAGE_BASE_URL}/${image}`}
                        alt="Attached announcement"
                        sx={{
                          width: "100%",
                          height: 100,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  ))}
                  {filePreviews.map(({ file: previewFile, url }, index) => (
                    <Box key={`${previewFile.name}-${index}`} sx={{ position: "relative" }}>
                      <Box
                        component="img"
                        src={url}
                        alt={previewFile.name}
                        sx={{
                          width: "100%",
                          height: 100,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                      />
                      <Tooltip title="Remove photo">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(event) => handleRemoveImage(event, index)}
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            bgcolor: "background.paper",
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {isEdit && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sendUpdateEmail}
                    onChange={(event) => setSendUpdateEmail(event.target.checked)}
                    disabled={loading}
                  />
                }
                label="Send update email to students"
              />
            )}
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
