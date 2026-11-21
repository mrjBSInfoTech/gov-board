import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Helmet } from "react-helmet-async";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  createGovernanceAnnouncement,
  deleteGovernanceAnnouncement,
  fetchGovernanceAnnouncements,
  updateGovernanceAnnouncement,
} from "../../api/admin/governanceAnnouncementAPI";
import { API_BASE_URL } from "../../api/apiBaseURL";
import { getAnnouncementImages } from "../../utils/announcementImages";
import {
  formatAnnouncementBodyHtml,
  stripAnnouncementHtml,
} from "../../utils/announcementFormat";
import AnnouncementDelete from "../../components/officer/Announcement/AnnouncementDelete";
import RichTextEditor from "../../components/common/RichTextEditor";

const GOVERNANCE_IMAGE_BASE_URL = `${API_BASE_URL}/uploads/admin/governanceAnnouncement`;

export default function RoomGovernanceAnnouncement() {
  const isGlobalAdmin = localStorage.getItem("admin_position") === "Super Admin";
  const adminCollege = localStorage.getItem("admin_college");
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editFiles, setEditFiles] = useState([]);
  const [editSendEmail, setEditSendEmail] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setFilePreviews(previews);
    return () => previews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [files]);

  const loadAnnouncements = useCallback(async () => {
    setError("");
    try {
      setAnnouncements(await fetchGovernanceAnnouncements());
    } catch (loadError) {
      setError(loadError.message || "Unable to load governance announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const hasBodyText = Boolean(stripAnnouncementHtml(announcementBody));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasBodyText || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createGovernanceAnnouncement({
        title: title.trim(),
        announcement_body: announcementBody.trim(),
        link: link.trim(),
        files,
      });
      setTitle("");
      setAnnouncementBody("");
      setLink("");
      setFiles([]);
      setSuccess("Announcement posted.");
      await loadAnnouncements();
    } catch (submitError) {
      setError(submitError.message || "Unable to post announcement.");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (announcement) => {
    setEditTarget(announcement);
    setEditTitle(announcement.title || "");
    setEditBody(announcement.announcement_body || "");
    setEditLink(announcement.link || "");
    setEditFiles([]);
    setEditSendEmail(false);
    setEditError("");
    setEditOpen(true);
  };

  const closeEditDialog = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditTarget(null);
    setEditFiles([]);
    setEditSendEmail(false);
    setEditError("");
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editTarget || editSaving) return;
    if (!stripAnnouncementHtml(editBody)) {
      setEditError("Announcement text is required.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      await updateGovernanceAnnouncement(editTarget.announcement_id, {
        title: editTitle.trim(),
        announcement_body: editBody.trim(),
        link: editLink.trim(),
        files: editFiles,
        send_update_email: editSendEmail,
      });
      setEditOpen(false);
      setEditTarget(null);
      setEditFiles([]);
      setEditSendEmail(false);
      setSuccess("Announcement updated.");
      await loadAnnouncements();
    } catch (updateError) {
      setEditError(updateError.message || "Unable to update announcement.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles((currentFiles) => [
      ...currentFiles,
      ...selectedFiles,
    ]);
    event.target.value = "";
  };

  const canDeleteAnnouncement = (announcement) =>
    isGlobalAdmin ||
    (announcement.visibility_scope === "college" &&
      String(announcement.college || "").toLocaleLowerCase() ===
        String(adminCollege || "").toLocaleLowerCase());

  const handleDeleteAnnouncement = async (announcementId) => {
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      await deleteGovernanceAnnouncement(announcementId);
      setDeleteOpen(false);
      setSelectedAnnouncement(null);
      setSuccess("Announcement deleted.");
      await loadAnnouncements();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete announcement.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: "auto" }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Governance Announcement</title>
      </Helmet>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <CampaignOutlinedIcon color="primary" />
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Announcement
        </Typography>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {isGlobalAdmin
          ? "Global announcements appear in rooms set to Every college."
          : `Your announcements are shown to ${adminCollege || "your college"} members in rooms that include that college.`}{" "}
        Room owners control the audience in room settings; anyone with a room
        code can still join.
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Typography variant="h6">New announcement</Typography>
            <TextField
              label="Title / Subject (optional)"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. University-Wide Assembly"
              inputProps={{ maxLength: 200 }}
              disabled={saving}
              fullWidth
            />
            <RichTextEditor
              label="Announcement"
              value={announcementBody}
              onChange={setAnnouncementBody}
              placeholder="Write your announcement..."
              disabled={saving}
              required
            />
            <TextField
              label="Link (optional)"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              inputProps={{ maxLength: 255 }}
              fullWidth
            />
            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={saving}
              >
                Add photos
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                JPG, PNG, GIF, WEBP; no photo-count limit; up to 10 MB per photo.
              </Typography>
              {filePreviews.length > 0 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    gap: 1,
                    mt: 1.5,
                  }}
                >
                  {filePreviews.map(({ file, url }, index) => (
                    <Box key={`${file.name}-${index}`} sx={{ position: "relative" }}>
                      <Box
                        component="img"
                        src={url}
                        alt={file.name}
                        sx={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 1 }}
                      />
                      <Tooltip title="Remove photo">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            setFiles((currentFiles) =>
                              currentFiles.filter((_, fileIndex) => fileIndex !== index),
                            )
                          }
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
            {error && <Alert severity="error">{error}</Alert>}
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !hasBodyText}
              >
                {saving ? "Posting..." : "Post announcement"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Recent announcements
      </Typography>
      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : announcements.length === 0 ? (
        <Typography color="text.secondary">
          No governance announcements have been posted yet.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {announcements.map((announcement) => (
            <Card key={announcement.announcement_id} variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "flex-start" }}
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {announcement.visibility_scope === "global"
                      ? "Every college"
                      : announcement.college}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ alignSelf: { xs: "flex-end", sm: "auto" }, textAlign: "right" }}
                  >
                    {new Date(announcement.date_created).toLocaleString()}
                  </Typography>
                </Stack>
                {announcement.title && (
                  <Typography
                    component="h3"
                    variant="h6"
                    sx={{ fontWeight: 700, mb: 0.75, color: "text.primary", overflowWrap: "anywhere" }}
                  >
                    {announcement.title}
                  </Typography>
                )}
                <Box
                  sx={{
                    color: "text.primary",
                    overflowWrap: "anywhere",
                    lineHeight: 1.65,
                    "& p": { m: 0, mb: 1 },
                    "& p:last-child": { mb: 0 },
                    "& ul, & ol": { pl: 3, my: 0.75 },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: formatAnnouncementBodyHtml(announcement.announcement_body),
                  }}
                />
                {announcement.link && (
                  <Typography
                    component="a"
                    href={
                      announcement.link.startsWith("http")
                        ? announcement.link
                        : `https://${announcement.link}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: "block", mt: 1, overflowWrap: "anywhere" }}
                  >
                    {announcement.link}
                  </Typography>
                )}
                {getAnnouncementImages(announcement).length > 0 && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 1,
                      mt: 2,
                    }}
                  >
                    {getAnnouncementImages(announcement).map((image) => (
                      <Box
                        key={image}
                        component="img"
                        src={`${GOVERNANCE_IMAGE_BASE_URL}/${encodeURIComponent(image)}`}
                        alt="Announcement attachment"
                        sx={{
                          width: "100%",
                          maxHeight: 320,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                      />
                    ))}
                  </Box>
                )}
                {canDeleteAnnouncement(announcement) && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mt: 1 }}>
                    <Tooltip title="Edit announcement">
                      <IconButton
                        color="primary"
                        aria-label="Edit announcement"
                        disabled={deleting || editSaving}
                        onClick={() => openEditDialog(announcement)}
                        sx={{ width: 44, height: 44 }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete announcement">
                      <IconButton
                        color="error"
                        aria-label="Delete announcement"
                        disabled={deleting || editSaving}
                        onClick={() => {
                          setSelectedAnnouncement(announcement);
                          setDeleteOpen(true);
                        }}
                        sx={{ width: 44, height: 44 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={editOpen} onClose={closeEditDialog} fullWidth maxWidth="md">
        <DialogTitle>Edit announcement</DialogTitle>
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="Title / Subject (optional)"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                inputProps={{ maxLength: 200 }}
                disabled={editSaving}
                fullWidth
              />
              <RichTextEditor
                label="Announcement"
                value={editBody}
                onChange={setEditBody}
                disabled={editSaving}
                required
              />
              <TextField
                label="Link (optional)"
                value={editLink}
                onChange={(event) => setEditLink(event.target.value)}
                inputProps={{ maxLength: 255 }}
                disabled={editSaving}
                fullWidth
              />
              <Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  disabled={editSaving}
                >
                  Add more photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    hidden
                    onChange={(event) => {
                      const selected = Array.from(event.target.files || []);
                      setEditFiles((current) => [...current, ...selected]);
                      event.target.value = "";
                    }}
                  />
                </Button>
                {editFiles.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                    {editFiles.length} new photo{editFiles.length === 1 ? "" : "s"} selected to append.
                  </Typography>
                )}
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editSendEmail}
                    onChange={(event) => setEditSendEmail(event.target.checked)}
                    disabled={editSaving}
                  />
                }
                label="Send update email to students"
              />
              {editError && <Alert severity="error">{editError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditDialog} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={editSaving || !stripAnnouncementHtml(editBody)}
            >
              {editSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <AnnouncementDelete
        open={deleteOpen}
        handleClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setSelectedAnnouncement(null);
          }
        }}
        selectedAnnouncement={selectedAnnouncement}
        onDelete={handleDeleteAnnouncement}
        loading={deleting}
      />
      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={() => setSuccess("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSuccess("")}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
