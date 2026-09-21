import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();

router.get("/same-section", authenticateOfficer, (req, res) => {
  const officerId = Number(req.user?.officer_id);

  const resolveSectionSql = `
    SELECT b.section_name AS section
    FROM officer o
    LEFT JOIN batch b ON b.batch_id = o.batch_id
    WHERE o.officer_id = ?
    LIMIT 1
  `;

  db.query(resolveSectionSql, [officerId], (err, sectionRows) => {
    if (err) {
      console.error("Moderator section lookup error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const section = String(sectionRows?.[0]?.section || "").trim();
    const hasSection = Boolean(section);

    const sql = hasSection
      ? `
          SELECT
            o.officer_id AS id,
            o.first_name,
            o.last_name,
            o.student_number,
            o.position,
            bo.year_name AS year,
            bo.section_name AS section,
            'Officer' AS member_type
          FROM officer o
          LEFT JOIN batch bo ON bo.batch_id = o.batch_id
          WHERE bo.section_name = ?

          UNION ALL

          SELECT
            s.student_id AS id,
            s.first_name,
            s.last_name,
            s.student_number,
            s.position,
            bs.year_name AS year,
            bs.section_name AS section,
            'Student' AS member_type
          FROM student s
          LEFT JOIN batch bs ON bs.batch_id = s.batch_id
          WHERE bs.section_name = ?

          ORDER BY member_type ASC, first_name ASC, last_name ASC
        `
      : `
          SELECT
            o.officer_id AS id,
            o.first_name,
            o.last_name,
            o.student_number,
            o.position,
            bo.year_name AS year,
            bo.section_name AS section,
            'Officer' AS member_type
          FROM officer o
          LEFT JOIN batch bo ON bo.batch_id = o.batch_id

          UNION ALL

          SELECT
            s.student_id AS id,
            s.first_name,
            s.last_name,
            s.student_number,
            s.position,
            bs.year_name AS year,
            bs.section_name AS section,
            'Student' AS member_type
          FROM student s
          LEFT JOIN batch bs ON bs.batch_id = s.batch_id

          ORDER BY member_type ASC, first_name ASC, last_name ASC
        `;

    const params = hasSection ? [section, section] : [];

    db.query(sql, params, (queryErr, results) => {
      if (queryErr) {
        console.error("Moderator list error:", queryErr);
        return res.status(500).json({ message: "Database error" });
      }

      res.json(results || []);
    });
  });
});

export default router;
