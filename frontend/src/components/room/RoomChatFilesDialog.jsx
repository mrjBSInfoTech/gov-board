import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AddReactionOutlinedIcon from "@mui/icons-material/AddReactionOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import LinkIcon from "@mui/icons-material/Link";
import SendIcon from "@mui/icons-material/Send";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { API_BASE_URL } from "../../api/apiBaseURL";

const ROOM_CHAT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function RoomChatFilesDialog({
  open,
  onClose,
  tab,
  onTabChange,
  messages,
  mediaItems,
  files,
  links,
  loadingMessages,
  message,
  onMessageChange,
  media,
  onMediaChange,
  onSend,
  sending,
  onReact,
  reactingMessageId,
  canReact,
  reactionAvailabilityError,
  onDelete,
  deletingMessageId,
  error,
  onClearError,
}) {
  const messagesEndRef = useRef(null);
  const mediaInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState(null);

  useEffect(() => {
    if (open && tab === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, tab]);

  return (
    <>
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
        Room chat and files
        <IconButton onClick={onClose} aria-label="Close room tools">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Paper
          elevation={0}
          sx={{ borderTop: "1px solid", borderColor: "divider" }}
        >
          <Tabs
            value={tab}
            onChange={(_, nextTab) => onTabChange(nextTab)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Tab
              icon={<ChatBubbleOutlineIcon />}
              iconPosition="start"
              label={`Chat (${messages.length})`}
            />
            <Tab
              icon={<AttachFileIcon />}
              iconPosition="start"
              label={`Media (${mediaItems.length})`}
            />
            <Tab
              icon={<InsertDriveFileOutlinedIcon />}
              iconPosition="start"
              label={`Files (${files.length})`}
            />
            <Tab
              icon={<LinkIcon />}
              iconPosition="start"
              label={`Links (${links.length})`}
            />
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
                {error}
              </Alert>
            )}
            {tab === 0 && reactionAvailabilityError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Reactions are unavailable because the room level could not be
                verified.
              </Alert>
            )}

            {tab === 0 && (
              <Box>
                <Box
                  sx={{
                    minHeight: 220,
                    maxHeight: 420,
                    overflowY: "auto",
                    mb: 2,
                  }}
                >
                  {loadingMessages ? (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", py: 8 }}
                    >
                      <CircularProgress size={28} />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 7 }}>
                      <ChatBubbleOutlineIcon
                        sx={{ fontSize: 46, color: "text.disabled", mb: 1 }}
                      />
                      <Typography color="text.secondary">
                        No messages yet
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        Start the conversation with this room.
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {messages.map((item) => {
                        const isMine = Boolean(item.is_mine);
                        return (
                        <ListItem
                          key={item.message_id}
                          disableGutters
                          sx={{
                            display: "flex",
                            justifyContent: isMine ? "flex-end" : "flex-start",
                            py: 1,
                          }}
                        >
                          <Paper
                            variant="outlined"
                            sx={{
                              width: "fit-content",
                              maxWidth: { xs: "94%", sm: "82%" },
                              minWidth: 120,
                              p: 1.5,
                              borderRadius: isMine
                                ? "16px 16px 4px 16px"
                                : "16px 16px 16px 4px",
                              bgcolor: isMine
                                ? "action.selected"
                                : "background.paper",
                              borderColor: isMine ? "primary.main" : "divider",
                              overflowWrap: "anywhere",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 1,
                              }}
                            >
                              <Typography
                                fontWeight={700}
                                sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                              >
                                {item.sender_name || "Unknown sender"}
                                {item.sender_position
                                  ? ` (${item.sender_position})`
                                  : ""}
                              </Typography>
                              <IconButton
                                aria-label={
                                  isMine
                                    ? "Delete message for everyone"
                                    : "Hide message for me"
                                }
                                title={
                                  isMine
                                    ? "Delete for everyone"
                                    : "Hide for me"
                                }
                                disabled={deletingMessageId === item.message_id}
                                onClick={() =>
                                  setConfirmDeleteMessageId(item.message_id)
                                }
                                sx={{ mt: -1, mr: -1, flexShrink: 0 }}
                              >
                                {isMine ? (
                                  <DeleteOutlineIcon />
                                ) : (
                                  <VisibilityOffOutlinedIcon />
                                )}
                              </IconButton>
                            </Box>

                            {item.media_url && item.media_type === "image" && (
                              <Box
                                component="button"
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: `${API_BASE_URL}${item.media_url}`,
                                    name: item.media_name || "Chat image",
                                  })
                                }
                                aria-label={`Enlarge ${item.media_name || "chat image"}`}
                                sx={{
                                  display: "block",
                                  border: 0,
                                  p: 0,
                                  bgcolor: "transparent",
                                  cursor: "zoom-in",
                                }}
                              >
                                <Box
                                  component="img"
                                  src={`${API_BASE_URL}${item.media_url}`}
                                  alt={item.media_name || "Image shared in chat"}
                                  sx={{
                                    display: "block",
                                    maxWidth: "100%",
                                    maxHeight: 260,
                                    borderRadius: 2,
                                    my: 1,
                                  }}
                                />
                              </Box>
                            )}
                            {item.media_url && item.media_type === "file" && (
                              <Button
                                component="a"
                                href={`${API_BASE_URL}${item.media_url}`}
                                target="_blank"
                                rel="noreferrer"
                                startIcon={<InsertDriveFileOutlinedIcon />}
                                size="small"
                                sx={{ my: 1 }}
                              >
                                {item.media_name || "Open attachment"}
                              </Button>
                            )}
                            {item.media_url && item.media_type === "video" && (
                              <Box
                                component="video"
                                src={`${API_BASE_URL}${item.media_url}`}
                                controls
                                preload="metadata"
                                sx={{
                                  display: "block",
                                  width: "100%",
                                  maxHeight: 280,
                                  borderRadius: 2,
                                  my: 1,
                                  bgcolor: "common.black",
                                }}
                              />
                            )}
                            {item.message && (
                              <Typography
                                component="p"
                                color="text.primary"
                                sx={{ my: item.media_url ? 0.5 : 0 }}
                              >
                                {item.message}
                              </Typography>
                            )}
                            <Typography
                              component="div"
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {new Date(item.date_created).toLocaleString()}
                            </Typography>

                            {canReact && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                  mt: 1,
                                }}
                              >
                                {(item.reactions || []).map((reaction) => (
                                  <Button
                                    key={reaction.emoji}
                                    type="button"
                                    variant={
                                      reaction.reacted_by_me
                                        ? "contained"
                                        : "outlined"
                                    }
                                    aria-label={`${reaction.emoji}, ${reaction.count} reactions`}
                                    aria-pressed={reaction.reacted_by_me}
                                    disabled={
                                      reactingMessageId === item.message_id
                                    }
                                    onClick={() =>
                                      onReact(item.message_id, reaction.emoji)
                                    }
                                    sx={{
                                      minWidth: 44,
                                      minHeight: 44,
                                      px: 1,
                                    }}
                                  >
                                    {reaction.emoji} {reaction.count}
                                  </Button>
                                ))}
                                <IconButton
                                  aria-label="Add a reaction"
                                  aria-expanded={
                                    reactionPickerMessageId === item.message_id
                                  }
                                  disabled={
                                    reactingMessageId === item.message_id
                                  }
                                  onClick={() =>
                                    setReactionPickerMessageId((current) =>
                                      current === item.message_id
                                        ? null
                                        : item.message_id,
                                    )
                                  }
                                >
                                  <AddReactionOutlinedIcon />
                                </IconButton>
                              </Box>
                            )}

                            {canReact &&
                              reactionPickerMessageId === item.message_id && (
                                <Box
                                  role="group"
                                  aria-label="Choose a reaction"
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 0.5,
                                    mt: 0.5,
                                  }}
                                >
                                  {ROOM_CHAT_REACTIONS.map((emoji) => (
                                    <Button
                                      key={emoji}
                                      type="button"
                                      aria-label={`React with ${emoji}`}
                                      disabled={
                                        reactingMessageId === item.message_id
                                      }
                                      onClick={() => {
                                        setReactionPickerMessageId(null);
                                        void onReact(item.message_id, emoji);
                                      }}
                                      sx={{ minWidth: 44, minHeight: 44 }}
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </Box>
                              )}

                            {confirmDeleteMessageId === item.message_id && (
                              <Box
                                role="group"
                                aria-label="Confirm message deletion"
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                  mt: 1,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ flexBasis: "100%" }}
                                >
                                  {isMine
                                    ? "Delete this message for everyone?"
                                    : "Hide this message from your view? Other members can still see it."}
                                </Typography>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDeleteMessageId(null)
                                  }
                                  sx={{ minHeight: 44 }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  color={isMine ? "error" : "primary"}
                                  disabled={
                                    deletingMessageId === item.message_id
                                  }
                                  onClick={() => {
                                    setConfirmDeleteMessageId(null);
                                    void onDelete(item.message_id);
                                  }}
                                  sx={{ minHeight: 44 }}
                                >
                                  {isMine ? "Delete for everyone" : "Hide for me"}
                                </Button>
                              </Box>
                            )}
                          </Paper>
                        </ListItem>
                      )})}
                      <Box ref={messagesEndRef} />
                    </List>
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box component="form" onSubmit={onSend}>
                  {media && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" noWrap>
                        {media.name}
                        {" · "}
                        {formatFileSize(media.size)}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label="Remove attachment"
                        onClick={() => onMediaChange(null)}
                        disabled={sending}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  <TextField
                    fullWidth
                    size="small"
                    value={message}
                    onChange={(event) => onMessageChange(event.target.value)}
                    placeholder="Write a message..."
                    disabled={sending}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <input
                            ref={mediaInputRef}
                            hidden
                            type="file"
                            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv,.zip"
                            onChange={(event) => {
                              onMediaChange(event.target.files?.[0] || null);
                              event.target.value = "";
                            }}
                          />
                          <IconButton
                            type="button"
                            aria-label="Attach an image, video, or file"
                            onClick={() => mediaInputRef.current?.click()}
                            disabled={sending}
                            edge="end"
                          >
                            <AttachFileIcon />
                          </IconButton>
                          <IconButton
                            type="submit"
                            disabled={(!message.trim() && !media) || sending}
                            edge="end"
                          >
                            <SendIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>
            )}

            {tab === 1 &&
              (mediaItems.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 7 }}>
                  <AttachFileIcon
                    sx={{ fontSize: 46, color: "text.disabled", mb: 1 }}
                  />
                  <Typography color="text.secondary">
                    No media shared in this room
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: 1.5,
                  }}
                >
                  {mediaItems.map((item) => (
                    <Paper
                      key={item.id}
                      variant="outlined"
                      sx={{ overflow: "hidden", borderRadius: 2 }}
                    >
                      {item.type === "image" ? (
                        <Box
                          component="button"
                          type="button"
                          onClick={() =>
                            setPreviewImage({ url: item.url, name: item.name })
                          }
                          aria-label={`Enlarge ${item.name}`}
                          sx={{
                            display: "block",
                            width: "100%",
                            border: 0,
                            p: 0,
                            bgcolor: "transparent",
                            cursor: "zoom-in",
                          }}
                        >
                          <Box
                            component="img"
                            src={item.url}
                            alt={item.name}
                            sx={{
                              display: "block",
                              width: "100%",
                              height: 140,
                              objectFit: "cover",
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          component="video"
                          src={item.url}
                          controls
                          preload="metadata"
                          sx={{
                            display: "block",
                            width: "100%",
                            height: 140,
                            bgcolor: "common.black",
                          }}
                        />
                      )}
                      <Box sx={{ p: 1 }}>
                        <Typography variant="body2" noWrap title={item.name}>
                          {item.name}
                        </Typography>
                        <Chip
                          label={item.type === "image" ? "Image" : "Video"}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ))}

            {tab === 2 &&
              (files.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 7 }}>
                  <InsertDriveFileOutlinedIcon
                    sx={{ fontSize: 46, color: "text.disabled", mb: 1 }}
                  />
                  <Typography color="text.secondary">
                    No files shared in this room
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {files.map((file) => (
                    <ListItem
                      key={file.id}
                      disableGutters
                      secondaryAction={
                        <Button
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          size="small"
                        >
                          Open
                        </Button>
                      }
                    >
                      <InsertDriveFileOutlinedIcon
                        sx={{ mr: 2, color: "primary.main" }}
                      />
                      <ListItemText
                        primary={file.name}
                        secondary={
                          <Chip label="File" size="small" sx={{ mt: 0.5 }} />
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ))}

            {tab === 3 &&
              (links.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 7 }}>
                  <LinkIcon sx={{ fontSize: 46, color: "text.disabled", mb: 1 }} />
                  <Typography color="text.secondary">
                    No links shared in this room
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {links.map((link) => (
                    <ListItem
                      key={link.id}
                      disableGutters
                      secondaryAction={
                        <Button
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          size="small"
                        >
                          Open
                        </Button>
                      }
                    >
                      <LinkIcon sx={{ mr: 2, color: "primary.main" }} />
                      <ListItemText
                        primary={link.name}
                        secondary={
                          <Chip label="Link" size="small" sx={{ mt: 0.5 }} />
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ))}
          </Box>
        </Paper>
      </DialogContent>
    </Dialog>
    <Dialog
      open={Boolean(previewImage)}
      onClose={() => setPreviewImage(null)}
      maxWidth="lg"
      fullWidth
      aria-labelledby="room-image-preview-title"
    >
      <DialogTitle
        id="room-image-preview-title"
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography component="span" noWrap sx={{ mr: 2 }}>
          {previewImage?.name}
        </Typography>
        <IconButton
          onClick={() => setPreviewImage(null)}
          aria-label="Close image preview"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        {previewImage && (
          <Box
            component="img"
            src={previewImage.url}
            alt={previewImage.name}
            sx={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
            }}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
