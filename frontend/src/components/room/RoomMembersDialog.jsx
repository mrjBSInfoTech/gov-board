import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PersonIcon from "@mui/icons-material/Person";

export default function RoomMembersDialog({
  open,
  onClose,
  members,
  loading,
  error,
  onClearError,
}) {
  const memberGroups = [
    {
      key: "admin",
      label: "Administration",
      members: members.filter((member) => member.member_type === "admin"),
    },
    {
      key: "officer",
      label: "Officers",
      members: members.filter((member) => member.member_type === "officer"),
    },
    {
      key: "student",
      label: "Students",
      members: members.filter((member) => member.member_type === "student"),
    },
  ];

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
        Room members
        <IconButton onClick={onClose} aria-label="Close room members">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        ) : members.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 7 }}>
            <PeopleAltIcon
              sx={{ fontSize: 46, color: "text.disabled", mb: 1 }}
            />
            <Typography color="text.secondary">
              No members in this room yet
            </Typography>
            <Typography variant="body2" color="text.disabled">
              People assigned to this room will appear here.
            </Typography>
          </Box>
        ) : (
          <Box>
            {memberGroups
              .filter((group) => group.members.length > 0)
              .map((group, groupIndex) => (
                <Box
                  key={group.key}
                  sx={{ mb: groupIndex < memberGroups.length - 1 ? 2.5 : 0 }}
                >
                  <Typography
                    variant="overline"
                    sx={{
                      display: "block",
                      color: "text.secondary",
                      fontWeight: 800,
                      letterSpacing: 1.2,
                      mb: 0.5,
                    }}
                  >
                    {group.label} ({group.members.length})
                  </Typography>
                  <Divider sx={{ mb: 0.5 }} />
                  <List disablePadding>
                    {group.members.map((member) => {
                      const initials = `${member.first_name?.[0] || ""}${member.last_name?.[0] || ""}`;
                      return (
                        <ListItem
                          key={`${member.member_type}-${member.member_id}`}
                          disableGutters
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: "primary.main" }}>
                              {initials || <PersonIcon />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${member.first_name} ${member.last_name}`}
                            secondary={`${member.position || "Member"} - ${member.section ? `Section ${member.section}` : "Room member"}`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
