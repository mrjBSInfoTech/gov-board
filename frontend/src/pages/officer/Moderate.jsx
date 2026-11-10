import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonRemoveAlt1Icon from "@mui/icons-material/PersonRemoveAlt1";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PeopleCardList from "../../components/common/PeopleCardList";
import { Navigate } from "react-router-dom";
import { canAccessGovernanceSection } from "../../utils/governanceAccess";
import StudentPromoteDialog from "../../components/admin/Student/StudentPromoteDialog";
import {
  demoteRoomMember,
  fetchRoomModerationMembers,
  kickRoomMember,
  muteRoomMember,
  promoteRoomMember,
  unmuteRoomMember,
} from "../../api/officer/moderateAPI";

const OFFICER_POSITIONS = [
  "Mayor",
  "Vice-Mayor",
  "Secretary",
  "Treasurer",
  "Auditor",
  "P.I.O.",
  "Protocol Officer",
];
const MUTE_OPTIONS = [
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 180, label: "3 hours" },
  { minutes: 720, label: "12 hours" },
  { minutes: 1440, label: "24 hours (maximum)" },
];

const normalizePosition = (position) =>
  String(position || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const getRank = (position) =>
  OFFICER_POSITIONS.findIndex(
    (item) => normalizePosition(item) === normalizePosition(position),
  );

const getActions = (actorPosition, member, actorId) => {
  const actor = normalizePosition(actorPosition);
  const targetPosition = normalizePosition(member.position);
  const targetType = String(member.member_type).toLowerCase();
  const actorRank = getRank(actorPosition);
  const targetRank =
    targetType === "student" ? OFFICER_POSITIONS.length : getRank(member.position);
  const differentMember = Number(member.id) !== Number(actorId);
  const mayorOrVice = actor === "mayor" || actor === "vice-mayor";
  const belowActor = differentMember && targetRank > actorRank;
  const promotionPositions = OFFICER_POSITIONS.filter((position, index) => {
    const isBelowActor = index > actorRank;
    const isPromotion = targetType === "student" || index < targetRank;
    return mayorOrVice && isBelowActor && isPromotion;
  });
  const canProtocolKick =
    actor === "protocol-officer" && differentMember && targetPosition !== "mayor";
  const canProtocolMute =
    actor === "protocol-officer" &&
    differentMember &&
    targetPosition !== "mayor" &&
    targetPosition !== "vice-mayor";

  return {
    canKick:
      (mayorOrVice && belowActor) || canProtocolKick,
    canPromote: promotionPositions.length > 0,
    promotionPositions,
    canDemote:
      mayorOrVice && differentMember && targetType === "officer" && belowActor,
    canMute: canProtocolMute && !member.muted_until,
    canUnmute: canProtocolMute && Boolean(member.muted_until),
  };
};

export default function Moderate({ roomId, position }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [promotePosition, setPromotePosition] = useState("");
  const [promoteError, setPromoteError] = useState("");
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [muteDuration, setMuteDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const actorId = Number(localStorage.getItem("officer_officer_id"));
  const memberRequestId = useRef(0);

  const loadMembers = useCallback(async () => {
    const requestId = ++memberRequestId.current;
    setLoading(true);
    setErrorMessage("");
    try {
      const roomMembers = await fetchRoomModerationMembers(roomId);
      if (requestId === memberRequestId.current) setMembers(roomMembers);
    } catch (error) {
      if (requestId === memberRequestId.current) {
        setErrorMessage(error.message || "Unable to load room members.");
      }
    } finally {
      if (requestId === memberRequestId.current) setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    setMembers([]);
    void loadMembers();
    return () => {
      memberRequestId.current += 1;
    };
  }, [loadMembers]);

  const memberTypeOptions = useMemo(() => {
    const options = new Set(members.map((member) => member.member_type));
    return ["All", ...Array.from(options)];
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return members.filter((member) => {
      const matchesType =
        selectedType === "All" || member.member_type === selectedType;
      const searchString =
        `${member.first_name} ${member.last_name} ${member.student_number} ${member.position || ""} ${member.section || ""}`.toLowerCase();
      return matchesType && (!keyword || searchString.includes(keyword));
    });
  }, [members, searchTerm, selectedType]);

  const closePromotion = () => {
    setSelectedMember(null);
    setPromotePosition("");
    setPromoteError("");
    setRequiresConfirmation(false);
  };

  const startPromotion = (member, options) => {
    setSelectedMember({ ...member, promotionPositions: options });
    setPromotePosition("");
    setPromoteError("");
    setRequiresConfirmation(false);
  };

  const runPendingAction = async () => {
    if (!pendingAction || !selectedMember) return;
    setSaving(true);
    setErrorMessage("");
    try {
      let result;
      if (pendingAction === "kick") {
        result = await kickRoomMember(roomId, selectedMember.id);
      } else if (pendingAction === "demote") {
        result = await demoteRoomMember(roomId, selectedMember.id);
      } else if (pendingAction === "mute") {
        result = await muteRoomMember(
          roomId,
          selectedMember.id,
          muteDuration,
        );
      } else {
        result = await unmuteRoomMember(roomId, selectedMember.id);
      }
      setPendingAction(null);
      setSelectedMember(null);
      setNotice(result.message);
      await loadMembers();
    } catch (error) {
      setErrorMessage(error.message || "Unable to update room member.");
    } finally {
      setSaving(false);
    }
  };

  const runPromotion = async () => {
    if (!selectedMember || !promotePosition) return;
    setSaving(true);
    try {
      const result = await promoteRoomMember(
        roomId,
        selectedMember.id,
        promotePosition,
        requiresConfirmation,
      );
      closePromotion();
      setNotice(result.message);
      await loadMembers();
    } catch (error) {
      const responseData = error?.response?.data;
      setPromoteError(
        responseData?.message || error.message || "Unable to promote member.",
      );
      setRequiresConfirmation(Boolean(responseData?.requiresConfirmation));
    } finally {
      setSaving(false);
    }
  };

  if (!canAccessGovernanceSection(position, "moderate")) {
    return (
      <Navigate
        to={roomId ? `/officer/rooms/${roomId}/hub` : "/officer/rooms/main"}
        replace
      />
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - GovBoard">
        <title>Moderate</title>
      </Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 }, mb: 1 }}
        >
          Moderate
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all students and officers in this room.
        </Typography>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage("")}>
          {errorMessage}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      {!loading && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <TextField
            fullWidth
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: { sm: 360 } }}
          />
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              aria-label="Filter members by type"
            >
              {memberTypeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {type === "All" ? "All Members" : type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <PeopleCardList
          items={filteredMembers}
          rowKey={(member) => `${member.member_type}-${member.id}`}
          emptyMessage="No students or officers found in this room."
          columns={[
            { label: "Type", key: "member_type" },
            {
              label: "Name",
              render: (member) =>
                `${member.first_name} ${member.last_name}`,
            },
            { label: "Student Number", key: "student_number" },
            { label: "Position", key: "position" },
            { label: "Year", key: "year" },
            { label: "Section", key: "section" },
            {
              label: "Mute Status",
              render: (member) => (member.muted_until ? "Muted" : "-"),
            },
            {
              label: "Muted Until",
              render: (member) =>
                member.muted_until
                  ? new Date(member.muted_until).toLocaleString()
                  : "-",
            },
          ]}
          renderActions={(member) => {
            const actions = getActions(position, member, actorId);
            return (
              <>
                {actions.canPromote && (
                  <Tooltip title="Promote">
                    <IconButton
                      aria-label={`Promote ${member.first_name} ${member.last_name}`}
                      onClick={() =>
                        startPromotion(member, actions.promotionPositions)
                      }
                    >
                      <TrendingUpIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {actions.canDemote && (
                  <Tooltip title="Demote to student">
                    <IconButton
                      aria-label={`Demote ${member.first_name} ${member.last_name}`}
                      onClick={() => {
                        setSelectedMember(member);
                        setPendingAction("demote");
                      }}
                    >
                      <PersonRemoveAlt1Icon />
                    </IconButton>
                  </Tooltip>
                )}
                {actions.canMute && (
                  <Tooltip title="Mute">
                    <IconButton
                      aria-label={`Mute ${member.first_name} ${member.last_name}`}
                      onClick={() => {
                        setSelectedMember(member);
                        setMuteDuration(30);
                        setPendingAction("mute");
                      }}
                    >
                      <VolumeOffIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {actions.canUnmute && (
                  <Tooltip title="Unmute">
                    <IconButton
                      aria-label={`Unmute ${member.first_name} ${member.last_name}`}
                      onClick={() => {
                        setSelectedMember(member);
                        setPendingAction("unmute");
                      }}
                    >
                      <VolumeUpIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {actions.canKick && (
                  <Tooltip title="Kick from room">
                    <IconButton
                      color="error"
                      aria-label={`Kick ${member.first_name} ${member.last_name}`}
                      onClick={() => {
                        setSelectedMember(member);
                        setPendingAction("kick");
                      }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            );
          }}
        />
      )}

      <StudentPromoteDialog
        open={Boolean(selectedMember?.promotionPositions)}
        handleClose={closePromotion}
        selectedStudent={selectedMember}
        memberLabel="Member"
        selectedPosition={promotePosition}
        onPositionChange={setPromotePosition}
        onConfirm={runPromotion}
        saving={saving}
        error={promoteError}
        requiresConfirmation={requiresConfirmation}
        positionOptions={selectedMember?.promotionPositions || []}
      />

      <Dialog
        open={Boolean(pendingAction)}
        onClose={() => !saving && setPendingAction(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {pendingAction === "kick"
            ? "Kick member from room?"
            : pendingAction === "demote"
              ? "Demote officer?"
              : pendingAction === "mute"
                ? "Mute member"
                : "Unmute member?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {pendingAction === "kick"
              ? `${selectedMember?.first_name} ${selectedMember?.last_name} will lose access to this room, but their account will remain.`
              : pendingAction === "demote"
                ? `${selectedMember?.first_name} ${selectedMember?.last_name} will become a student in this room.`
                : pendingAction === "mute"
                  ? `${selectedMember?.first_name} ${selectedMember?.last_name} can still view existing chat and files but cannot send messages or upload files until the mute expires.`
                  : `${selectedMember?.first_name} ${selectedMember?.last_name} will be able to send messages and files again.`}
          </Typography>
          {pendingAction === "mute" && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="room-mute-duration-label">Duration</InputLabel>
              <Select
                labelId="room-mute-duration-label"
                label="Duration"
                value={muteDuration}
                onChange={(event) => setMuteDuration(event.target.value)}
              >
                {MUTE_OPTIONS.map((option) => (
                  <MenuItem key={option.minutes} value={option.minutes}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPendingAction(null)}
            disabled={saving}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={runPendingAction}
            disabled={saving}
            variant="contained"
            color={pendingAction === "kick" ? "error" : "primary"}
          >
            {saving ? <CircularProgress size={20} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
