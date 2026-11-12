const csvValue = (value) => {
  const text = value == null ? "" : String(value);
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const csvRow = (values) => values.map(csvValue).join(",");

export const buildGovernanceReportCsv = (
  {
    announcements = [],
    events = [],
    budgets = [],
    funds = [],
    contributions = [],
    members = [],
    audit = [],
  },
  section = "all",
) => {
  const rows = [["GovBoard Governance Report"]];
  const addSection = (title, headers, records) => {
    rows.push([], [title], headers);
    records.forEach((record) => rows.push(record));
  };

  const sections = {
    announcement: () =>
      addSection(
        "Announcements",
        ["ID", "Created", "Announcement", "Link"],
        announcements.map((item) => [
          item.announcement_id,
          item.date_created,
          item.announcement_body,
          item.link,
        ]),
      ),
    "event-handlers": () =>
      addSection(
        "Events",
        ["ID", "Starts", "Ends", "Title", "Description"],
        events.map((item) => [
          item.event_id,
          item.start_at,
          item.end_at,
          item.title,
          item.description,
        ]),
      ),
    budget: () =>
      addSection(
        "Budget Plans",
        ["ID", "Name", "Category", "Planned amount", "Deadline", "Description", "Status", "Collected"],
        budgets.map((item) => [
          item.budget_id,
          item.budget_name,
          item.category,
          item.planned_amount,
          item.deadline,
          item.description,
          item.status,
          item.total_collected,
        ]),
      ),
    funds: () => {
      addSection(
        "Funds",
        ["ID", "Name", "Status", "Target", "Approved collected", "Pending review"],
        funds.map((item) => [
          item.fund_id,
          item.fund_name,
          item.status,
          item.target_amount,
          item.total_approved,
          item.total_pending,
        ]),
      );
      addSection(
        "Fund Contributions",
        ["ID", "Fund", "Member", "Amount", "Date", "Method", "Review status", "Remarks"],
        contributions.map((item) => [
          item.contribution_id,
          item.fund_name,
          item.member_name,
          item.amount,
          item.payment_date,
          item.payment_method,
          item.review_status,
          item.remarks,
        ]),
      );
    },
    moderate: () =>
      addSection(
        "Room Members",
        ["ID", "Member", "Student number", "Member type", "Position", "Year", "Section", "Muted until"],
        members.map((item) => [
          item.member_id,
          item.member_name,
          item.student_number,
          item.member_type,
          item.position,
          item.year,
          item.section,
          item.muted_until,
        ]),
      ),
    audit: () =>
      addSection(
        "Audit",
        ["ID", "Date", "Actor", "Role", "Action", "Status", "Information"],
        audit.map((item) => [
          item.audit_id,
          item.datetime,
          item.actor,
          item.role,
          item.action,
          item.status,
          item.information,
        ]),
      ),
  };

  if (section === "all") {
    Object.values(sections).forEach((addReportSection) => addReportSection());
  } else {
    sections[section]();
  }

  return `\uFEFF${rows.map(csvRow).join("\r\n")}`;
};
