import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();

router.get("/same-section", authenticateOfficer, (req, res) => {
  const officerId = Number(req.user?.officer_id);

  const resolveSectionSql = `
    SELECT b.year_name AS year, b.section_name AS section
    FROM student o
    LEFT JOIN batch b ON b.batch_id = o.batch_id
    WHERE o.student_id = ? AND o.role IS NOT NULL
    LIMIT 1
  `;

  db.query(resolveSectionSql, [officerId], (err, sectionRows) => {
    if (err) {
      console.error("Moderator section lookup error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const year = String(sectionRows?.[0]?.year || "").trim();
    const section = String(sectionRows?.[0]?.section || "").trim();
    const hasBatch = Boolean(year && section);

    const sql = hasBatch
      ? `
          SELECT
            o.student_id AS id,
            o.first_name,
            o.last_name,
            o.student_number,
            o.position,
            bo.year_name AS year,
            bo.section_name AS section,
            'Officer' AS member_type
          FROM student o
          LEFT JOIN batch bo ON bo.batch_id = o.batch_id
          WHERE bo.year_name = ? AND bo.section_name = ? AND o.role IS NOT NULL

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
          WHERE s.role IS NULL AND bs.year_name = ? AND bs.section_name = ?

          ORDER BY member_type ASC, first_name ASC, last_name ASC
        `
      : `
          SELECT
            o.student_id AS id,
            o.first_name,
            o.last_name,
            o.student_number,
            o.position,
            bo.year_name AS year,
            bo.section_name AS section,
            'Officer' AS member_type
          FROM student o
          LEFT JOIN batch bo ON bo.batch_id = o.batch_id
          WHERE o.role IS NOT NULL

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
          WHERE s.role IS NULL

          ORDER BY member_type ASC, first_name ASC, last_name ASC
        `;

    const params = hasBatch ? [year, section, year, section] : [];

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
