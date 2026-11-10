import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Helmet } from "react-helmet-async";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  createGovernanceAnnouncement,
  fetchGovernanceAnnouncements,
} from "../../api/admin/governanceAnnouncementAPI";
import { API_BASE_URL } from "../../api/apiBaseURL";
import { getAnnouncementImages } from "../../utils/announcementImages";

const GOVERNANCE_IMAGE_BASE_URL = `${API_BASE_URL}/uploads/admin/governanceAnnouncement`;

export default function RoomGovernanceAnnouncement() {
  const isGlobalAdmin = localStorage.getItem("admin_position") === "Super Admin";
  const adminCollege = localStorage.getItem("admin_college");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementBody, setAnnouncementBody] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!announcementBody.trim() || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createGovernanceAnnouncement({
        announcement_body: announcementBody.trim(),
        link: link.trim(),
        files,
      });
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

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles((currentFiles) => [
      ...currentFiles,
      ...selectedFiles,
    ]);
    event.target.value = "";
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
          ? "Global announcements appear in every room."
          : `Your announcements are shown to ${adminCollege || "your college"} members in rooms that include that college.`}{" "}
        Room owners control the audience in room settings; anyone with a room
        code can still join.
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Typography variant="h6">New announcement</Typography>
            <TextField
              label="Announcement"
              value={announcementBody}
              onChange={(event) => setAnnouncementBody(event.target.value)}
              multiline
              minRows={4}
              maxRows={10}
              inputProps={{ maxLength: 5000 }}
              required
              fullWidth
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
            {success && <Alert severity="success">{success}</Alert>}
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !announcementBody.trim()}
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
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {announcement.visibility_scope === "global"
                      ? "Every college"
                      : announcement.college}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(announcement.date_created).toLocaleString()}
                  </Typography>
                </Stack>
                <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {announcement.announcement_body}
                </Typography>
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
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
