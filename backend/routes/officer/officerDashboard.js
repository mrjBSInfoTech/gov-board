import express from "express";
import db from "../../database/db.js";
import { authenticateOfficer } from "../../middleware/officerAuthMiddleware.js";

const router = express.Router();

router.get("/summary", authenticateOfficer, (req, res) => {
  const officerId = req.user?.officer_id || req.user?.id;

  const summaryQueries = [
    "SELECT COUNT(*) AS announcement_count FROM announcement",
    "SELECT COUNT(*) AS officer_count FROM officer WHERE officer_id = ?",
    "SELECT COUNT(*) AS review_count FROM student WHERE officer_id = ?",
  ];

  const queryPromises = summaryQueries.map((sql, index) => {
    const params = index === 0 ? [] : [officerId];

    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(results[0]);
      });
    });
  });

  Promise.all(queryPromises)
    .then(([announcement, officer, review]) => {
      res.json({
        announcements: Number(announcement?.announcement_count || 0),
        account: Number(officer?.officer_count || 0),
        moderate: Number(review?.review_count || 0),
      });
    })
    .catch((err) => {
      console.error("Dashboard summary error:", err);
      res.status(500).json({ message: "Failed to load dashboard summary" });
    });
});

export default router;
