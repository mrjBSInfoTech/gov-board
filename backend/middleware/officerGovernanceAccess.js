import db from "../database/db.js";
import {
  canAccessGovernanceSection,
  canGenerateGovernanceReport,
  canManageGovernanceSection,
} from "../utils/officer/governancePermissions.js";

const isValidRoomId = (value) =>
  /^\d+$/.test(String(value ?? "")) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

export const requireOfficerGovernanceAccess = ({
  section,
  action = "view",
  getRoomId = (req) => req.query.roomId ?? req.body?.room_id,
  resource,
}) => (req, res, next) => {
  const authorizeInRoom = (roomId) => {
    if (!isValidRoomId(roomId)) {
      return res.status(400).json({ message: "A valid roomId is required." });
    }

    db.query(
      `SELECT position
         FROM room_member
        WHERE room_id = ? AND member_id = ? AND member_type = 'officer'
        LIMIT 1`,
      [roomId, req.user.officer_id],
      (error, rows) => {
        if (error) {
          console.error("Governance access lookup error:", error);
          return res.status(500).json({ message: "Unable to verify governance access." });
        }
        const membership = rows[0];
        if (!membership) {
          return res.status(403).json({ message: "You are not an officer in this room." });
        }

        const permitted =
          action === "manage"
            ? canManageGovernanceSection(membership.position, section)
            : action === "report"
              ? canGenerateGovernanceReport(membership.position)
              : canAccessGovernanceSection(membership.position, section);
        if (!permitted) {
          return res.status(403).json({ message: "Your position cannot access this governance action." });
        }

        req.governanceRoomId = Number(roomId);
        req.roomId = Number(roomId);
        req.governancePosition = membership.position;
        next();
      },
    );
  };

  if (!resource) return authorizeInRoom(getRoomId(req));

  const resourceId = req.params[resource.idParam];
  if (!/^\d+$/.test(String(resourceId ?? "")) || Number(resourceId) < 1) {
    return res.status(400).json({ message: "A valid record ID is required." });
  }
  db.query(
    `SELECT ${resource.roomColumn} AS room_id
       FROM ${resource.table}
      WHERE ${resource.idColumn} = ? LIMIT 1`,
    [resourceId],
    (error, rows) => {
      if (error) {
        console.error("Governance resource lookup error:", error);
        return res.status(500).json({ message: "Unable to verify governance access." });
      }
      if (!rows.length) return res.status(404).json({ message: "Governance record not found." });
      authorizeInRoom(rows[0].room_id);
    },
  );
};
