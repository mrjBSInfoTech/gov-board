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
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import LinkIcon from "@mui/icons-material/Link";
import SendIcon from "@mui/icons-material/Send";

export default function RoomChatFilesDialog({
  open,
  onClose,
  tab,
  onTabChange,
  messages,
  files,
  loadingMessages,
  message,
  onMessageChange,
  onSend,
  sending,
  error,
  onClearError,
}) {
  return (
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
            variant="fullWidth"
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
              label={`Files (${files.length})`}
            />
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
                {error}
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
                      {messages.map((item) => (
                        <ListItem
                          key={item.message_id}
                          alignItems="flex-start"
                          disableGutters
                          sx={{ py: 1 }}
                        >
                          <ListItemText
                            primary={
                              <Typography fontWeight={700}>
                                {item.sender_name || "Room member"}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography
                                  component="span"
                                  color="text.primary"
                                >
                                  {item.message}
                                </Typography>
                                <br />
                                <Typography component="span" variant="caption">
                                  {new Date(item.date_created).toLocaleString()}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box component="form" onSubmit={onSend}>
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
                          <IconButton
                            type="submit"
                            disabled={!message.trim() || sending}
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
              (files.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 7 }}>
                  <InsertDriveFileOutlinedIcon
                    sx={{ fontSize: 46, color: "text.disabled", mb: 1 }}
                  />
                  <Typography color="text.secondary">
                    No files shared in this room
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Images and links attached to announcements will appear here.
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
                      {file.type === "Link" ? (
                        <LinkIcon sx={{ mr: 2, color: "primary.main" }} />
                      ) : (
                        <InsertDriveFileOutlinedIcon
                          sx={{ mr: 2, color: "primary.main" }}
                        />
                      )}
                      <ListItemText
                        primary={file.name}
                        secondary={
                          <Chip
                            label={file.type}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
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
  );
}
