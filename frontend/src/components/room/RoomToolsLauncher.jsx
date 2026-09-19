import { Box, Button } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

export default function RoomToolsLauncher({
  messageCount,
  memberCount,
  onOpenChatFiles,
  onOpenMembers,
}) {
  const buttonStyles = {
    borderRadius: 2,
    textTransform: "none",
    fontWeight: 700,
    px: 2,
  };

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Button
        variant="outlined"
        startIcon={<ChatBubbleOutlineIcon />}
        onClick={onOpenChatFiles}
        sx={buttonStyles}
      >
        Chat & files {messageCount > 0 ? `(${messageCount})` : ""}
      </Button>
      <Button
        variant="outlined"
        startIcon={<PeopleAltIcon />}
        onClick={onOpenMembers}
        sx={buttonStyles}
      >
        Members ({memberCount})
      </Button>
    </Box>
  );
}
