import express from "express";
import jwt from "jsonwebtoken";
import db from "../database/db.js";
import { getRoomLevel } from "../utils/shared/roomLevelService.js";

const router = express.Router();

const authenticateRoomUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET || "your_secret_key", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    req.user = user;
    next();
  });
};

router.get("/:roomId/level", authenticateRoomUser, async (req, res) => {
  const roomId = Number(req.params.roomId);
  const memberId = req.user.officer_id || req.user.student_id || req.user.id;

  if (!Number.isInteger(roomId) || roomId < 1 || !memberId) {
    return res.status(400).json({ message: "A valid room and member are required." });
  }

  db.query(
    `SELECT room_id FROM room_member
      WHERE room_id = ? AND member_id = ?
        AND member_type IN ('student', 'officer') LIMIT 1`,
    [roomId, memberId],
    async (error, rows) => {
      if (error) {
        console.error("Room level membership lookup error:", error);
        return res.status(500).json({ message: "Unable to verify room membership." });
      }

      if (!rows.length) {
        return res.status(403).json({ message: "You are not a member of this room." });
      }

      try {
        res.json(await getRoomLevel(roomId));
      } catch (levelError) {
        console.error("Room level read error:", levelError);
        res.status(500).json({ message: "Unable to load room level." });
      }
    },
  );
});

export default router;
