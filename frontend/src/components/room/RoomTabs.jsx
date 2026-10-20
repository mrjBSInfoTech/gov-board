import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchRoomMembers,
  fetchRoomMessages,
  sendRoomMessage,
} from "../../api/roomAPI";
import RoomChatFilesDialog from "./RoomChatFilesDialog";
import RoomMembersDialog from "./RoomMembersDialog";
import RoomToolsLauncher from "./RoomToolsLauncher";
import CalendarEventsDialog from "./CalendarEventsDialog";
import StudentPromoteDialog from "../admin/Student/StudentPromoteDialog";
import AccountDemote from "../admin/Account/AccountDemote";
import { promoteStudent } from "../../api/admin/studentAPI";
import { demoteAccount } from "../../api/admin/accountAPI";
import { API_BASE_URL } from "../../api/apiBaseURL";
import {
  promoteOfficerMember,
  demoteOfficerMember,
} from "../../api/officer/memberAPI";

const FILE_BASE_URL = `${API_BASE_URL}/uploads/officer/uploadAnnouncement`;
const MAX_CHAT_MEDIA_SIZE = 50 * 1024 * 1024;
const CHAT_MEDIA_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp",
  "mp4", "webm", "mov",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "odt", "ods", "odp", "rtf", "txt", "csv", "zip",
]);

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
  const isAdminSession = Boolean(localStorage.getItem("admin_token"));
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
    !isAdminSession &&
      localStorage.getItem("officer_token") &&
      officerRank >= 0,
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [chatMedia, setChatMedia] = useState(null);
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

  const loadMessages = useCallback(
    async (showLoading = false) => {
      if (!roomId) return;

      if (showLoading) setLoadingMessages(true);
      try {
        setMessages(await fetchRoomMessages(roomId));
        setError((currentError) =>
          currentError === "Internal server error" ||
          currentError === "Unable to load room messages"
            ? ""
            : currentError,
        );
      } catch (err) {
        setError(err.message || "Unable to load room messages.");
      } finally {
        if (showLoading) setLoadingMessages(false);
      }
    },
    [roomId],
  );

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

    void loadMessages(true);
    loadMembers();
  }, [loadMembers, loadMessages, roomId]);

  useEffect(() => {
    if (!roomId || !chatFilesOpen) return undefined;

    let cancelled = false;
    let timeoutId;
    const pollMessages = async () => {
      await loadMessages();
      if (!cancelled) {
        timeoutId = setTimeout(pollMessages, 3000);
      }
    };

    void pollMessages();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [chatFilesOpen, loadMessages, roomId]);

  const sharedItems = useMemo(
    () =>
      announcements.reduce(
        (items, announcement) => {
          if (announcement.image) {
            items.media.push({
              id: `image-${announcement.announcement_id}`,
              name: announcement.image,
              url: `${FILE_BASE_URL}/${announcement.image}`,
              type: "image",
            });
          }
          if (announcement.link) {
            items.links.push({
              id: `link-${announcement.announcement_id}`,
              name: announcement.link,
              url: announcement.link.startsWith("http")
                ? announcement.link
                : `https://${announcement.link}`,
            });
          }
          return items;
        },
        { media: [], links: [] },
      ),
    [announcements],
  );

  const chatAttachments = useMemo(
    () =>
      messages
        .filter((item) => item.media_url)
        .map((item) => ({
          id: `chat-${item.message_id}`,
          name: item.media_name || "Chat attachment",
          url: `${API_BASE_URL}${item.media_url}`,
          type: item.media_type,
        })),
    [messages],
  );

  const sharedMedia = useMemo(
    () => [
      ...sharedItems.media,
      ...chatAttachments.filter(
        (item) => item.type === "image" || item.type === "video",
      ),
    ],
    [chatAttachments, sharedItems.media],
  );

  const sharedFiles = useMemo(
    () => chatAttachments.filter((item) => item.type === "file"),
    [chatAttachments],
  );

  const sharedLinks = sharedItems.links;

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && !chatMedia) || sending) return;

    setSending(true);
    setError("");
    try {
      const createdMessage = await sendRoomMessage(
        roomId,
        trimmedMessage,
        getCurrentUserName(),
        chatMedia,
      );
      setMessages((currentMessages) => [...currentMessages, createdMessage]);
      setMessage("");
      setChatMedia(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleChatMediaChange = (file) => {
    setError("");
    setChatMedia(null);
    if (!file) return;
    if (file && file.size > MAX_CHAT_MEDIA_SIZE) {
      setError("Media files must be 50 MB or smaller.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !CHAT_MEDIA_EXTENSIONS.has(extension)) {
      setError("This file type is not supported in room chat.");
      return;
    }
    setChatMedia(file);
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
        onOpenCalendar={() => setCalendarOpen(true)}
      />

      <CalendarEventsDialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        roomId={roomId}
      />

      <RoomChatFilesDialog
        open={chatFilesOpen}
        onClose={() => setChatFilesOpen(false)}
        tab={tab}
        onTabChange={setTab}
        messages={messages}
        mediaItems={sharedMedia}
        files={sharedFiles}
        links={sharedLinks}
        loadingMessages={loadingMessages}
        message={message}
        onMessageChange={setMessage}
        media={chatMedia}
        onMediaChange={handleChatMediaChange}
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
