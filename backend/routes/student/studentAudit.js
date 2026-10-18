import express from "express";
import { authenticateStudent } from "../../middleware/studentAuthMiddleware.js";
import { logStudentAudit } from "../../utils/student/studentAuditLogger.js";

const router = express.Router();
router.use(authenticateStudent);
router.use((req, res, next) => {
  if (req.user.admin_id || req.user.officer_id || !req.user.student_number) {
    return res.status(403).json({ message: "A student session is required." });
  }
  next();
});

router.get("/", (req, res) => res.status(403).json({ message: "Audit viewing is available to officers only." }));
router.post("/", async (req, res) => {
  if (req.body.action !== "Logout") {
    return res.status(400).json({ message: "Unsupported audit action" });
  }
  const saved = await logStudentAudit(req.user.student_id, {
    action: "Logout",
    role: "Student",
    status: "Success",
  });
  if (!saved) return res.status(500).json({ message: "Unable to record logout" });
  res.status(201).json({ message: "Logout recorded" });
});

export default router;
