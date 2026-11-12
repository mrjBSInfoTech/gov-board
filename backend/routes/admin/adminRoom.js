import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import {
  getAdminCollegeFilter,
  getAdminRoomCollegeFilter,
} from "../../utils/shared/adminScope.js";
import { clearOrphanedOfficerStatus } from "../../utils/shared/roomOfficerAccess.js";
import { normalizeRoomCollegeTargets } from "../../utils/shared/roomCollegeAudience.js";
import { getRoomCollegeAudiencePredicate } from "../../utils/shared/calendarEventScope.js";

const router = express.Router();

// Helper: generate a Google Classroom-style room code (e.g. "abc-1x2y")
const generateRoomCode = () => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const alphanumeric = "abcdefghijklmnopqrstuvwxyz0123456789";
  const part1 = Array.from(
    { length: 3 },
    () => letters[Math.floor(Math.random() * letters.length)],
  ).join("");
  const part2 = Array.from(
    { length: 4 },
    () => alphanumeric[Math.floor(Math.random() * alphanumeric.length)],
  ).join("");
  return `${part1}-${part2}`;
};

const getRoomCollegeTargets = async (connection, rooms) => {
  if (!rooms.length) return rooms;
  const roomIds = rooms.map(({ room_id }) => room_id);
  const [targets] = await connection.query(
    `SELECT room_id, college
       FROM room_college
      WHERE room_id IN (${roomIds.map(() => "?").join(", ")})`,
    roomIds,
  );
  const collegesByRoom = new Map();
  for (const { room_id, college } of targets) {
    const colleges = collegesByRoom.get(room_id) || [];
    colleges.push(college);
    collegesByRoom.set(room_id, colleges);
  }
  return rooms.map((room) => ({
    ...room,
    all_colleges: Boolean(room.all_colleges),
    colleges: collegesByRoom.get(room.room_id) || [],
  }));
};

const validateRoomAudience = (req, body) => {
  const hasAudience =
    Object.hasOwn(body, "all_colleges") || Object.hasOwn(body, "colleges");
  if (!hasAudience) return { audience: null, error: null };
  if (body.all_colleges === true) {
    return { audience: { allColleges: true, colleges: [] }, error: null };
  }
  if (body.all_colleges !== false || !Array.isArray(body.colleges)) {
    return {
      audience: null,
      error: "Choose all colleges or select specific colleges.",
    };
  }

  const requestedColleges = normalizeRoomCollegeTargets(body.colleges);
  if (!requestedColleges) {
    return { audience: null, error: "The selected colleges are invalid." };
  }
  if (!requestedColleges.length) {
    return { audience: null, error: "Select at least one college." };
  }
  if (
    !req.user.is_super_admin &&
    requestedColleges.some(
      (college) => college.toLocaleLowerCase() !== req.user.college.toLocaleLowerCase(),
    )
  ) {
    return {
      audience: null,
      error:       "You can only target your assigned college.",
    };
  }

  return {
    audience: { allColleges: false, colleges: requestedColleges },
    error: null,
  };
};

const saveRoomCollegeTargets = async (connection, roomId, audience) => {
  if (!audience) return;
  await connection.query("DELETE FROM room_college WHERE room_id = ?", [roomId]);
  for (const college of audience.colleges) {
    await connection.query(
      "INSERT INTO room_college (room_id, college) VALUES (?, ?)",
      [roomId, college],
    );
  }
};

// GET all rooms
router.get("/", authenticateAdmin, async (req, res) => {
  const collegeFilter = getAdminRoomCollegeFilter(req, "college");
  const sql = `
    SELECT room_id, room_number, room_name, description, college,
           all_colleges, date_created
    FROM room
    WHERE 1 = 1${collegeFilter.sql}
    ORDER BY date_created DESC`;

  try {
    const connection = db.promise();
    const [rooms] = await connection.query(sql, collegeFilter.params);
    res.json(await getRoomCollegeTargets(connection, rooms));
  } catch (error) {
    console.error("Room list error:", error);
    res.status(500).json({ message: "Unable to load rooms." });
  }
});

// GET generate a new unique room code
router.get("/generate-code", authenticateAdmin, (req, res) => {
  const code = generateRoomCode();
  res.json({ code });
});

router.get("/colleges", authenticateAdmin, async (req, res) => {
  const collegeFilter = req.user.is_super_admin
    ? ""
    : " AND LOWER(college) = LOWER(?)";
  const params = req.user.is_super_admin ? [] : [req.user.college];
  try {
    const [rows] = await db.promise().query(
      `SELECT college FROM (
         SELECT college FROM student
         UNION
         SELECT college FROM admin
         UNION
         SELECT college FROM room_college
       ) AS known_colleges
       WHERE college IS NOT NULL AND TRIM(college) <> ?${collegeFilter}
       ORDER BY college`,
      ["", ...params],
    );
    res.json(rows.map(({ college }) => college));
  } catch (error) {
    console.error("Room college options error:", error);
    res.status(500).json({ message: "Unable to load college options." });
  }
});

// GET one room
router.get("/:id", authenticateAdmin, async (req, res) => {
  const collegeFilter = getAdminRoomCollegeFilter(req, "college");
  const sql = `
    SELECT room_id, room_number, room_name, description, college,
           all_colleges, date_created
    FROM room
    WHERE room_id = ?${collegeFilter.sql}
    LIMIT 1`;

  try {
    const connection = db.promise();
    const [rooms] = await connection.query(sql, [
      req.params.id,
      ...collegeFilter.params,
    ]);
    if (!rooms.length) return res.status(404).json({ message: "Room not found" });
    res.json((await getRoomCollegeTargets(connection, rooms))[0]);
  } catch (error) {
    console.error("Room lookup error:", error);
    res.status(500).json({ message: "Unable to load room." });
  }
});

// GET room and governance announcements visible in one authorized room.
router.get("/:id/announcements", authenticateAdmin, async (req, res) => {
  const roomId = Number(req.params.id);
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    return res.status(400).json({ message: "A valid room ID is required." });
  }

  const roomCollegeFilter = getAdminRoomCollegeFilter(req, "r.college");
  const governanceCollegeFilter = req.user.is_super_admin
    ? ""
    : " AND LOWER(ga.college) = LOWER(?)";
  const governanceCollegeParams = req.user.is_super_admin
    ? []
    : [req.user.college];

  try {
    const [announcements] = await db.promise().query(
      `SELECT *
         FROM (
           SELECT a.announcement_id, a.room_id, a.announcement_body, a.link,
                  a.image, a.images, a.date_created, 'room' AS source_type
             FROM announcement a
             JOIN room r ON r.room_id = a.room_id
            WHERE a.room_id = ?${roomCollegeFilter.sql}
           UNION ALL
           SELECT ga.announcement_id, r.room_id, ga.announcement_body, ga.link,
                  NULL AS image, ga.images, ga.date_created, 'governance' AS source_type
             FROM governance_announcement ga
             JOIN room r ON r.room_id = ?
            WHERE r.room_id = ?
              AND (
                ga.visibility_scope = 'global'
                OR (
                  ga.visibility_scope = 'college'
                  AND ${getRoomCollegeAudiencePredicate("ga.college")}
                  ${governanceCollegeFilter}
                )
              )
         ) AS visible_announcements
        ORDER BY date_created DESC, announcement_id DESC`,
      [
        roomId,
        ...roomCollegeFilter.params,
        roomId,
        roomId,
        ...governanceCollegeParams,
      ],
    );
    res.json(announcements);
  } catch (error) {
    console.error("Admin room announcements query error:", error);
    res.status(500).json({ message: "Unable to load room announcements." });
  }
});

// POST create new room
router.post("/", authenticateAdmin, async (req, res) => {
  const { room_number, room_name, description } = req.body;
  const cleanName = typeof room_name === "string" ? room_name.trim() : "";
  const cleanDescription =
    typeof description === "string" ? description.trim() : "";
  if (!cleanName || !cleanDescription) {
    return res.status(400).json({ message: "Room name and description are required." });
  }
  if (cleanName.length > 100 || cleanDescription.length > 2000) {
    return res.status(400).json({ message: "Room name or description is too long." });
  }
  const roomCode = room_number || generateRoomCode();
  const college = req.user.is_super_admin ? null : req.user.college;

  const connection = db.promise();
  let transactionStarted = false;
  try {
    const { audience, error: audienceError } = validateRoomAudience(req, req.body);
    if (audienceError) {
      return res.status(400).json({ message: audienceError });
    }
    const roomAudience = audience || { allColleges: true, colleges: [] };
    await connection.beginTransaction();
    transactionStarted = true;
    const [result] = await connection.query(
      `INSERT INTO room
        (room_number, room_name, description, college, all_colleges, date_created)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [roomCode, cleanName, cleanDescription, college, roomAudience.allColleges],
    );
    await saveRoomCollegeTargets(connection, result.insertId, roomAudience);
    await connection.commit();
    transactionStarted = false;
    req.auditTargetId = result.insertId;
    req.auditRoomId = result.insertId;
    res.status(201).json({
      message: "Room created",
      room_id: result.insertId,
      room_number: roomCode,
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Room code is already in use." });
    }
    console.error("Room creation error:", error);
    res.status(500).json({ message: "Unable to create room." });
  }
});

// PUT update room
router.put("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { room_number, room_name, description } = req.body;
  const cleanName = typeof room_name === "string" ? room_name.trim() : "";
  const cleanDescription =
    typeof description === "string" ? description.trim() : "";
  if (!cleanName || !cleanDescription) {
    return res.status(400).json({ message: "Room name and description are required." });
  }
  if (cleanName.length > 100 || cleanDescription.length > 2000) {
    return res.status(400).json({ message: "Room name or description is too long." });
  }

  const collegeFilter = getAdminRoomCollegeFilter(req, "college");
  const connection = db.promise();
  let transactionStarted = false;
  try {
    const { audience, error: audienceError } = validateRoomAudience(req, req.body);
    if (audienceError) {
      return res.status(400).json({ message: audienceError });
    }
    await connection.beginTransaction();
    transactionStarted = true;
    const [rooms] = await connection.query(
      `SELECT room_id FROM room
        WHERE room_id = ?${collegeFilter.sql}
        LIMIT 1 FOR UPDATE`,
      [id, ...collegeFilter.params],
    );
    if (!rooms.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: "Room not found" });
    }
    const audienceSql = audience ? ", all_colleges = ?" : "";
    const audienceParams = audience ? [audience.allColleges] : [];
    await connection.query(
      `UPDATE room
          SET room_number = ?, room_name = ?, description = ?${audienceSql}
        WHERE room_id = ?${collegeFilter.sql}`,
      [
        room_number,
        cleanName,
        cleanDescription,
        ...audienceParams,
        id,
        ...collegeFilter.params,
      ],
    );
    await saveRoomCollegeTargets(connection, id, audience);
    await connection.commit();
    transactionStarted = false;
    res.json({ message: "Room updated" });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Room code is already in use." });
    }
    console.error("Room update error:", error);
    res.status(500).json({ message: "Unable to update room." });
  }
});

// DELETE room and remove its member records atomically.
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const collegeFilter = getAdminRoomCollegeFilter(req, "college");
  const connection = db.promise();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [rooms] = await connection.query(
      `SELECT room_id FROM room
        WHERE room_id = ?${collegeFilter.sql}
        LIMIT 1 FOR UPDATE`,
      [id, ...collegeFilter.params],
    );
    if (!rooms.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: "Room not found" });
    }

    const [roomMembers] = await connection.query(
      `SELECT member_id FROM room_member
        WHERE room_id = ?
        FOR UPDATE`,
      [id],
    );
    await connection.query("DELETE FROM room_member WHERE room_id = ?", [id]);
    await connection.query("DELETE FROM room_join_request WHERE room_id = ?", [id]);
    await connection.query("DELETE FROM room_college WHERE room_id = ?", [id]);
    const [result] = await connection.query(
      `DELETE FROM room WHERE room_id = ?${collegeFilter.sql}`,
      [id, ...collegeFilter.params],
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: "Room not found" });
    }

    await clearOrphanedOfficerStatus(
      connection,
      roomMembers.map(({ member_id }) => member_id),
    );

    await connection.commit();
    transactionStarted = false;
    res.json({ message: "Room deleted" });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error("Room deletion error:", error);
    res.status(500).json({ message: "Unable to delete room." });
  }
});

export default router;

// Backup code
{
  /*
import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// Helper: generate a Google Classroom-style room code (e.g. "abc-1x2y")
const generateRoomCode = () => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const alphanumeric = "abcdefghijklmnopqrstuvwxyz0123456789";
  const part1 = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => alphanumeric[Math.floor(Math.random() * alphanumeric.length)]).join("");
  return `${part1}-${part2}`;
};

// GET all rooms
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT room_id, room_number, room_name, date_created
    FROM room
    ORDER BY date_created DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(result);
  });
});

// GET generate a new unique room code
router.get("/generate-code", authenticateAdmin, (req, res) => {
  const code = generateRoomCode();
  res.json({ code });
});

// POST create new room
router.post("/", authenticateAdmin, (req, res) => {
  const { room_number, room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  // Use provided code or generate one
  const roomCode = room_number || generateRoomCode();

  const sql = `
    INSERT INTO room (room_number, room_name, date_created)
    VALUES (?, ?, NOW())`;

  db.query(sql, [roomCode, room_name], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(201).json({
      message: "Room created",
      room_id: result.insertId,
      room_number: roomCode,
    });
  });
});

// PUT update room
router.put("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { room_number, room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ message: "Room name is required" });
  }

  const sql = `UPDATE room SET room_number = ?, room_name = ? WHERE room_id = ?`;

  db.query(sql, [room_number, room_name, id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json({ message: "Room updated" });
  });
});

// DELETE room
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM room WHERE room_id = ?", [id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json({ message: "Room deleted" });
  });
});

export default router;
*/
}
