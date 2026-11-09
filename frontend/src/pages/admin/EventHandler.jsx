import Calendar from "../officer/Calendar";
import {
  createAdminCalendarEvent,
  deleteAdminCalendarEvent,
  fetchAdminCalendarEvents,
  updateAdminCalendarEvent,
} from "../../api/admin/calendarAPI";

const ADMIN_CALENDAR_API = {
  createCalendarEvent: createAdminCalendarEvent,
  deleteCalendarEvent: deleteAdminCalendarEvent,
  fetchCalendarEvents: fetchAdminCalendarEvents,
  updateCalendarEvent: updateAdminCalendarEvent,
};

export default function EventHandler() {
  const isSuperAdmin =
    localStorage.getItem("admin_id") === "1" &&
    localStorage.getItem("admin_position") === "Super Admin";
  const college = localStorage.getItem("admin_college");

  return (
    <Calendar
      eventApi={ADMIN_CALENDAR_API}
      title="Event Scheduler"
      description="Create and manage events displayed on room calendars."
      scopeDescription={
        isSuperAdmin
          ? "New events will appear in every room."
          : `New events will appear in rooms in ${college || "your college"}.`
      }
    />
  );
}
