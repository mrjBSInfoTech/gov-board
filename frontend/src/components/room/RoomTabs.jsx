import { useEffect, useMemo, useState } from "react";
import {
  fetchRoomMembers,
  fetchRoomMessages,
  sendRoomMessage,
} from "../../api/roomAPI";
import RoomChatFilesDialog from "./RoomChatFilesDialog";
import RoomMembersDialog from "./RoomMembersDialog";
import RoomToolsLauncher from "./RoomToolsLauncher";

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

export default function RoomTabs({ announcements, roomId }) {
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

  useEffect(() => {
    if (!roomId) return;

    setLoadingMessages(true);
    fetchRoomMessages(roomId)
      .then(setMessages)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMessages(false));

    setLoadingMembers(true);
    fetchRoomMembers(roomId)
      .then(setMembers)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMembers(false));
  }, [roomId]);

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

  return (
    <>
      <RoomToolsLauncher
        messageCount={messages.length}
        memberCount={members.length}
        onOpenChatFiles={() => {
          setTab(0);
          setChatFilesOpen(true);
        }}
        onOpenMembers={() => setMembersOpen(true)}
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

      <RoomMembersDialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        members={members}
        loading={loadingMembers}
        error={error}
        onClearError={clearError}
      />
    </>
  );
}
