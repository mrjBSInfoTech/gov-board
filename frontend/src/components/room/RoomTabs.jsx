import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchRoomMembers,
  fetchRoomMessages,
  sendRoomMessage,
} from "../../api/roomAPI";
import RoomChatFilesDialog from "./RoomChatFilesDialog";
import RoomMembersDialog from "./RoomMembersDialog";
import RoomToolsLauncher from "./RoomToolsLauncher";
import StudentPromoteDialog from "../admin/Student/StudentPromoteDialog";
import AccountDemote from "../admin/Account/AccountDemote";
import { promoteStudent } from "../../api/admin/studentAPI";
import { demoteAccount } from "../../api/admin/accountAPI";
import {
  promoteOfficerMember,
  demoteOfficerMember,
} from "../../api/officer/memberAPI";

const FILE_BASE_URL =
  "http://localhost:5000/uploads/officer/uploadAnnouncement";

function getCurrentUserName() {
  const firstName =
    localStorage.getItem("officer_first_name") ||
    localStorage.getItem("student_first_name") ||
    localStorage.getItem("admin_first_name") ||
    "";
  const lastName =
    localStorage.getItem("officer_last_name") ||
    localStorage.getItem("student_last_name") ||
    localStorage.getItem("admin_last_name") ||
    "";
  return `${firstName} ${lastName}`.trim() || "Room member";
}

export default function RoomTabs({
  announcements,
  roomId,
  canManageMembers = false,
}) {
  const officerPosition = localStorage.getItem("officer_position")?.replace(
    "Vice Mayor",
    "Vice-Mayor",
  );
  const officerRanks = [
    "Mayor",
    "Vice-Mayor",
    "Secretary",
    "Treasurer",
    "Auditor",
    "P.I.O.",
    "Protocol Officer",
  ];
  const officerRank = officerRanks.indexOf(officerPosition);
  const isOfficerManager = Boolean(
    localStorage.getItem("officer_token") && officerRank >= 0,
  );
  const officerPositionOptions = isOfficerManager
    ? officerRanks.slice(officerRank + 1)
    : officerRanks;
  const canManageOfficerMember = (member) => {
    if (!isOfficerManager) return true;
    const memberRank = officerRanks.indexOf(
      member.position?.replace("Vice Mayor", "Vice-Mayor"),
    );
    return member.member_type === "student" || memberRank > officerRank;
  };
  const [chatFilesOpen, setChatFilesOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [promotePosition, setPromotePosition] = useState("");
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [promoteError, setPromoteError] = useState("");
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [demoteDialogOpen, setDemoteDialogOpen] = useState(false);

  const loadMembers = useCallback(() => {
    if (!roomId) return;

    setLoadingMembers(true);
    fetchRoomMembers(roomId)
      .then(setMembers)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMembers(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    setLoadingMessages(true);
    fetchRoomMessages(roomId)
      .then(setMessages)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMessages(false));

    loadMembers();
  }, [loadMembers, roomId]);

  const files = useMemo(
    () =>
      announcements.flatMap((announcement) => {
        const items = [];
        if (announcement.image) {
          items.push({
            id: `image-${announcement.announcement_id}`,
            name: announcement.image,
            url: `${FILE_BASE_URL}/${announcement.image}`,
            type: "Image",
          });
        }
        if (announcement.link) {
          items.push({
            id: `link-${announcement.announcement_id}`,
            name: announcement.link,
            url: announcement.link.startsWith("http")
              ? announcement.link
              : `https://${announcement.link}`,
            type: "Link",
          });
        }
        return items;
      }),
    [announcements],
  );

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sending) return;

    setSending(true);
    setError("");
    try {
      const createdMessage = await sendRoomMessage(
        roomId,
        trimmedMessage,
        getCurrentUserName(),
      );
      setMessages((currentMessages) => [...currentMessages, createdMessage]);
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const clearError = () => setError("");

  const handlePromote = (member) => {
    setMembersOpen(false);
    setSelectedMember(member);
    setPromotePosition("");
    setPromoteError("");
    setRequiresConfirmation(false);
    setPromoteDialogOpen(true);
  };

  const handleConfirmPromotion = async () => {
    if (!selectedMember || !promotePosition) return;

    try {
      if (isOfficerManager) {
        await promoteOfficerMember(
          selectedMember.member_id,
          roomId,
          promotePosition,
          requiresConfirmation,
        );
      } else {
        await promoteStudent(
          selectedMember.member_id,
          promotePosition,
          requiresConfirmation,
        );
      }
      setPromoteDialogOpen(false);
      setSelectedMember(null);
      setPromotePosition("");
      setRequiresConfirmation(false);
      loadMembers();
    } catch (promotionErrorResponse) {
      const responseData = promotionErrorResponse?.response?.data;
      const message =
        responseData?.message ||
        promotionErrorResponse.message ||
        "Unable to promote student.";
      setPromoteError(message);
      setRequiresConfirmation(Boolean(responseData?.requiresConfirmation));
    }
  };

  const handleDemote = (member) => {
    setMembersOpen(false);
    setSelectedMember(member);
    setDemoteDialogOpen(true);
  };

  const handleConfirmDemotion = async () => {
    if (!selectedMember) return;

    try {
      if (isOfficerManager) {
        await demoteOfficerMember(selectedMember.member_id, roomId);
      } else {
        await demoteAccount(selectedMember.member_id);
      }
      setDemoteDialogOpen(false);
      setSelectedMember(null);
      loadMembers();
    } catch (demotionError) {
      setError(demotionError.message || "Unable to demote officer.");
    }
  };

  return (
    <>
      <RoomToolsLauncher
        messageCount={messages.length}
        memberCount={members.length}
        onOpenChatFiles={() => {
          setTab(0);
          setChatFilesOpen(true);
        }}
        onOpenMembers={() => {
          loadMembers();
          setMembersOpen(true);
        }}
      />

      <RoomChatFilesDialog
        open={chatFilesOpen}
        onClose={() => setChatFilesOpen(false)}
        tab={tab}
        onTabChange={setTab}
        messages={messages}
        files={files}
        loadingMessages={loadingMessages}
        message={message}
        onMessageChange={setMessage}
        onSend={handleSend}
        sending={sending}
        error={error}
        onClearError={clearError}
      />

      <StudentPromoteDialog
        open={promoteDialogOpen}
        handleClose={() => {
          setPromoteDialogOpen(false);
          setSelectedMember(null);
          setPromoteError("");
          setPromotePosition("");
          setRequiresConfirmation(false);
        }}
        selectedStudent={selectedMember}
        selectedPosition={promotePosition}
        onPositionChange={setPromotePosition}
        onConfirm={handleConfirmPromotion}
        error={promoteError}
        requiresConfirmation={requiresConfirmation}
        positionOptions={officerPositionOptions}
      />

      <AccountDemote
        open={demoteDialogOpen}
        handleClose={() => {
          setDemoteDialogOpen(false);
          setSelectedMember(null);
        }}
        selectedAccount={selectedMember}
        onConfirm={handleConfirmDemotion}
      />

      <RoomMembersDialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        members={members}
        loading={loadingMembers}
        error={error}
        onClearError={clearError}
        canManageMembers={canManageMembers}
        canManageMember={canManageOfficerMember}
        onPromote={handlePromote}
        onDemote={handleDemote}
      />
    </>
  );
}
