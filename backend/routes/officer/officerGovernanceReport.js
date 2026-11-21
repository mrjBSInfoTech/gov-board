import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";
import { requireOfficerGovernanceAccess } from "../../middleware/officerGovernanceAccess.js";
import {
  canDownloadGovernanceSectionReport,
} from "../../utils/officer/governancePermissions.js";
import {
  getRoomCalendarEventPredicate,
  getRoomCollegeMemberVisibilityPredicate,
} from "../../utils/shared/calendarEventScope.js";
import { buildGovernanceReportCsv } from "../../utils/officer/governanceReportCsv.js";
import { logOfficerAudit } from "../../utils/officer/officerAuditLogger.js";
import { stripAnnouncementHtml } from "../../utils/shared/announcementFormat.js";

const router = express.Router();

router.get(
  "/",
  authenticateOfficer,
  requireOfficerGovernanceAccess({ section: "reports", action: "report" }),
  async (req, res) => {
    const section = String(req.query.section || "all");
    const reportSections = [
      "all",
      "announcement",
      "event-handlers",
      "budget",
      "funds",
      "moderate",
      "audit",
    ];
    if (!reportSections.includes(section)) {
      return res.status(400).json({ message: "Choose a valid Governance report section." });
    }
    if (section !== "all" && !canDownloadGovernanceSectionReport(req.governancePosition)) {
      return res.status(403).json({
        message: "Your position can only download the combined Governance report.",
      });
    }

    try {
      const connection = db.promise();
      const roomId = req.governanceRoomId;
      const [announcements, budgets, events, members, funds, contributions, audit] = await Promise.all([
        connection.query(
          `SELECT announcement_id, date_created, title, announcement_body, link
             FROM announcement
            WHERE room_id = ?
            ORDER BY date_created DESC, announcement_id DESC`,
          [roomId],
        ).then(([rows]) =>
          rows.map((item) => {
            const plainBody = stripAnnouncementHtml(item.announcement_body);
            return {
              ...item,
              announcement_body: item.title
                ? `${item.title}: ${plainBody}`
                : plainBody,
            };
          }),
        ),
        connection.query(
          `SELECT b.budget_id, b.budget_name, b.category, b.planned_amount,
                  DATE_FORMAT(b.deadline, '%Y-%m-%d') AS deadline, b.description,
                  b.status,
                  COALESCE((SELECT SUM(fc.amount)
                              FROM funds f
                              INNER JOIN fund_contributions fc ON fc.fund_id = f.fund_id
                             WHERE f.budget_id = b.budget_id AND f.room_id = b.room_id
                               AND fc.review_status = 'Approved'), 0) AS total_collected
             FROM budgets b
            WHERE b.room_id = ?
            ORDER BY b.created_at DESC, b.budget_id DESC`,
          [roomId],
        ).then(([rows]) => rows),
        connection.query(
          `SELECT e.event_id, e.start_at, e.end_at, e.title, e.description
             FROM room r
             INNER JOIN calendar_event e
               ON ${getRoomCalendarEventPredicate("e", "r")}
             INNER JOIN student s ON s.student_id = ?
            WHERE r.room_id = ? AND e.start_at >= CURRENT_DATE
              AND (
                e.visibility_scope <> 'college'
                OR ${getRoomCollegeMemberVisibilityPredicate("e.college")}
              )
            ORDER BY e.start_at ASC, e.event_id ASC`,
          [req.user.officer_id, roomId],
        ).then(([rows]) => rows),
        connection.query(
          `SELECT rm.member_id,
                  CONCAT(s.first_name, ' ', s.last_name) AS member_name,
                  s.student_number,
                  CASE WHEN rm.member_type = 'officer' THEN 'Officer' ELSE 'Student' END AS member_type,
                  rm.position, b.year_name AS year, b.section_name AS section,
                  CASE
                    WHEN rm.muted_until > UTC_TIMESTAMP()
                    THEN DATE_FORMAT(rm.muted_until, '%Y-%m-%dT%H:%i:%sZ')
                    ELSE NULL
                  END AS muted_until
             FROM room_member rm
             INNER JOIN student s ON s.student_id = rm.member_id
             LEFT JOIN batch b ON b.batch_id = s.batch_id
            WHERE rm.room_id = ?
            ORDER BY rm.member_type ASC, s.first_name ASC, s.last_name ASC`,
          [roomId],
        ).then(([rows]) => rows),
        connection.query(
          `SELECT f.fund_id, f.fund_name, f.status, f.target_amount,
                  COALESCE(SUM(CASE WHEN fc.review_status = 'Approved' THEN fc.amount ELSE 0 END), 0) AS total_approved,
                  COALESCE(SUM(CASE WHEN fc.review_status = 'Pending' THEN fc.amount ELSE 0 END), 0) AS total_pending
             FROM funds f
             LEFT JOIN fund_contributions fc ON fc.fund_id = f.fund_id
            WHERE f.room_id = ?
            GROUP BY f.fund_id, f.fund_name, f.status, f.target_amount
            ORDER BY f.created_at DESC, f.fund_id DESC`,
          [roomId],
        ).then(([rows]) => rows),
        connection.query(
          `SELECT fc.contribution_id, f.fund_name,
                  CONCAT(s.first_name, ' ', s.last_name) AS member_name,
                  fc.amount, fc.payment_date, fc.payment_method,
                  fc.review_status, fc.remarks
             FROM funds f
             INNER JOIN fund_contributions fc ON fc.fund_id = f.fund_id
             INNER JOIN student s ON s.student_id = fc.student_id
            WHERE f.room_id = ?
            ORDER BY fc.payment_date DESC, fc.contribution_id DESC`,
          [roomId],
        ).then(([rows]) => rows),
        connection.query(
          `SELECT audit_id, datetime, actor, role, action, status, information
             FROM audit_logs
            WHERE room_id = ?
            ORDER BY datetime DESC, audit_id DESC`,
          [roomId],
        ).then(([rows]) => rows),
      ]);

      const csv = buildGovernanceReportCsv({
        announcements,
        events,
        budgets,
        funds,
        contributions,
        members,
        audit,
      }, section);
      const saved = await logOfficerAudit(req.user.officer_id, {
        action: "Report Download",
        status: "Success",
        room_id: roomId,
        information: `Downloaded the ${section === "all" ? "combined Governance" : section} report`,
      });
      if (!saved) {
        return res.status(500).json({ message: "Unable to record the report download." });
      }
      const date = new Date().toISOString().slice(0, 10);
      const fileSection = section === "all" ? "governance" : section;
      res
        .setHeader("Content-Type", "text/csv; charset=utf-8")
        .setHeader(
          "Content-Disposition",
          `attachment; filename="${fileSection}-report-room-${roomId}-${date}.csv"`,
        )
        .send(csv);
    } catch (error) {
      console.error("Governance report generation error:", error);
      res.status(500).json({ message: "Unable to generate the governance report." });
    }
  },
);

export default router;
