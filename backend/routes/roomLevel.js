import express from "express";
import jwt from "jsonwebtoken";
import db from "../database/db.js";
import {
  getRoomLevel,
  getRoomQuests,
} from "../utils/shared/roomLevelService.js";
import { isRoomMember } from "../utils/shared/roomMembership.js";

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
  }  );
};

const requireRoomMember = async (req, res, next) => {
  const roomId = Number(req.params.roomId);
  const memberId = req.user.officer_id || req.user.student_id || req.user.id;
  const memberType = req.user.officer_id ? "officer" : "student";

  if (!Number.isSafeInteger(roomId) || roomId < 1 ||
      !Number.isSafeInteger(Number(memberId)) || Number(memberId) < 1) {
    return res
      .status(400)
      .json({ message: "A valid room and member are required." });
  }

  try {
    if (!(await isRoomMember(db, roomId, Number(memberId), memberType))) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });
    }

    req.roomId = roomId;
    req.roomMemberId = Number(memberId);
    return next();
  } catch (error) {
    console.error("Room level membership lookup error:", error);
    return res
      .status(500)
      .json({ message: "Unable to verify room membership." });
  }
};

router.get(
  "/:roomId/level",
  authenticateRoomUser,
  requireRoomMember,
  async (req, res) => {
    try {
      res.json(await getRoomLevel(req.roomId));
    } catch (error) {
      console.error("Room level read error:", error);
      res.status(500).json({ message: "Unable to load room level." });
    }
  },
);

router.get(
  "/:roomId/quests",
  authenticateRoomUser,
  requireRoomMember,
  async (req, res) => {
    try {
      res.json(await getRoomQuests(req.roomId, req.roomMemberId));
    } catch (error) {
      console.error("Room quest read error:", error);
      res.status(500).json({ message: "Unable to load room quests." });
    }
  },
);

export default router;
