import express from "express";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import mysql from "mysql2/promise";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { logAudit } from "../../utils/shared/auditLogger.js";
import {
  createSystemBackup,
  extractSystemBackup,
  InvalidBackupError,
  restoreSystemBackup,
  validateSystemBackup,
} from "../../utils/admin/systemBackup.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDirectory = path.resolve(__dirname, "../..");
const MAX_BACKUP_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const BACKUP_LOCK_NAME = "gov-board-system-backup";
const getBackupAction = (req) =>
  req.path === "/export" ? "System Backup Export" : "System Backup Import";

class BackupBusyError extends Error {}
class BackupSizeError extends Error {}

const logBackupAction = (req, status, information) =>
  logAudit({
    action: getBackupAction(req),
    actor: req.user?.username || `Admin ${req.user?.admin_id || "Unknown"}`,
    role: "Admin",
    status,
    information,
  });

const openBackupConnection = () =>
  mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    timezone: "Z",
    dateStrings: true,
  });

const acquireBackupLock = async (connection) => {
  const [rows] = await connection.query("SELECT GET_LOCK(?, 0) AS acquired", [
    BACKUP_LOCK_NAME,
  ]);
  if (Number(rows[0]?.acquired) !== 1) {
    throw new BackupBusyError("Another system backup operation is already running.");
  }
  return async () => {
    await connection.query("SELECT RELEASE_LOCK(?)", [BACKUP_LOCK_NAME]);
  };
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.is_super_admin) {
    void logBackupAction(req, "Failed", "Only the Super Admin may use backups.");
    return res.status(403).json({
      message: "Only the Super Admin can use system backups.",
    });
  }
  next();
};

const verifyAdminPassword = async (req, res, next) => {
  const password = req.get("X-Admin-Password");
  if (typeof password !== "string" || password.length === 0 || password.length > 1024) {
    void logBackupAction(req, "Failed", "Password reauthentication failed.");
    return res.status(400).json({ message: "Enter your admin password to continue." });
  }

  try {
    const [rows] = await db
      .promise()
      .query("SELECT password FROM admin WHERE admin_id = ? LIMIT 1", [
        req.user.admin_id,
      ]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
      void logBackupAction(req, "Failed", "Password reauthentication failed.");
      return res.status(401).json({ message: "The admin password is incorrect." });
    }
    next();
  } catch (error) {
    console.error("Unable to reauthenticate admin for system backup:", error);
    res.status(500).json({ message: "Unable to verify the admin password." });
  }
};

const createWorkingDirectory = async (req, res, next) => {
  try {
    req.backupWorkingDirectory = await fs.promises.mkdtemp(
      path.join(backendDirectory, ".system-backup-"),
    );
    next();
  } catch (error) {
    next(error);
  }
};

const cleanupWorkingDirectory = async (workingDirectory) => {
  if (!workingDirectory) return;
  try {
    await fs.promises.rm(workingDirectory, { recursive: true, force: true });
  } catch (error) {
    console.error("Unable to remove temporary system backup files:", error);
  }
};

const backupUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) =>
      callback(null, req.backupWorkingDirectory),
    filename: (_req, _file, callback) => callback(null, "uploaded-backup.zip"),
  }),
  limits: { fileSize: MAX_BACKUP_FILE_SIZE, files: 1, fields: 0 },
});

const receiveBackupFile = (req, res, next) => {
  backupUpload.single("backup")(req, res, async (error) => {
    if (!error) {
      next();
      return;
    }

    await cleanupWorkingDirectory(req.backupWorkingDirectory);
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "Backup files must be 2 GB or smaller." });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({ message: "Select one backup ZIP file to import." });
      return;
    }
    console.error("Unable to store uploaded system backup:", error.code || error.name);
    res.status(500).json({ message: "Unable to store the uploaded backup file." });
  });
};

router.post(
  "/export",
  authenticateAdmin,
  requireSuperAdmin,
  verifyAdminPassword,
  createWorkingDirectory,
  async (req, res) => {
    let connection;
    let releaseBackupLock;
    try {
      connection = await openBackupConnection();
      await connection.query("SET time_zone = '+00:00'");
      releaseBackupLock = await acquireBackupLock(connection);
      const archivePath = path.join(req.backupWorkingDirectory, "gov-board-backup.zip");
      await createSystemBackup(
        connection,
        backendDirectory,
        req.backupWorkingDirectory,
        archivePath,
      );
      await releaseBackupLock();
      releaseBackupLock = null;
      await connection.end();
      connection = null;

      const filename = `gov-board-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.zip`;
      const archiveStat = await fs.promises.stat(archivePath);
      if (archiveStat.size > MAX_BACKUP_FILE_SIZE) {
        throw new BackupSizeError("Backup ZIP files must be 2 GB or smaller.");
      }
      res.set({
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": archiveStat.size,
        "Content-Type": "application/zip",
        "Access-Control-Expose-Headers": "Content-Disposition",
        "X-Content-Type-Options": "nosniff",
      });
      await pipeline(fs.createReadStream(archivePath), res);
      await logBackupAction(req, "Success", "System backup exported.");
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error);
      } else if (error instanceof BackupBusyError) {
        await logBackupAction(req, "Failed", "Another backup operation is running.");
        res.status(409).json({ message: error.message });
      } else if (error instanceof BackupSizeError) {
        await logBackupAction(req, "Failed", "System backup exceeds the file size limit.");
        res.status(413).json({ message: error.message });
      } else {
        console.error("System backup export failed:", error.code || error.name);
        await logBackupAction(req, "Failed", "System backup export failed.");
        res.status(500).json({ message: "Unable to export the system backup." });
      }
    } finally {
      if (releaseBackupLock) {
        try {
          await releaseBackupLock();
        } catch (error) {
          console.error("Unable to release system backup lock:", error);
        }
      }
      if (connection) {
        try {
          await connection.end();
        } catch (error) {
          console.error("Unable to close system backup database connection:", error);
        }
      }
      await cleanupWorkingDirectory(req.backupWorkingDirectory);
    }
  },
);

router.post(
  "/import",
  authenticateAdmin,
  requireSuperAdmin,
  verifyAdminPassword,
  createWorkingDirectory,
  receiveBackupFile,
  async (req, res) => {
    let connection;
    let releaseBackupLock;
    try {
      if (!req.file) {
        await logBackupAction(req, "Failed", "No backup file was provided.");
        return res.status(400).json({ message: "Select a backup ZIP file to import." });
      }

      const extractDirectory = path.join(req.backupWorkingDirectory, "extracted");
      const { extractedFiles } = await extractSystemBackup(
        req.file.path,
        extractDirectory,
      );
      connection = await openBackupConnection();
      await connection.query("SET time_zone = '+00:00'");
      releaseBackupLock = await acquireBackupLock(connection);
      const manifest = await validateSystemBackup(
        extractDirectory,
        connection,
        extractedFiles,
      );
      await restoreSystemBackup(
        connection,
        manifest,
        extractDirectory,
        backendDirectory,
        req.backupWorkingDirectory,
      );
      await releaseBackupLock();
      releaseBackupLock = null;
      await connection.end();
      connection = null;
      await logBackupAction(req, "Success", "System data restored from backup.");
      res.json({
        message: "The system was restored from the selected backup.",
      });
    } catch (error) {
      if (error instanceof BackupBusyError) {
        await logBackupAction(req, "Failed", "Another backup operation is running.");
        res.status(409).json({ message: error.message });
      } else if (error instanceof InvalidBackupError) {
        await logBackupAction(req, "Failed", "Invalid system backup file.");
        res.status(400).json({ message: error.message });
      } else {
        console.error("System backup import failed:", error.code || error.name);
        await logBackupAction(req, "Failed", "System backup import failed.");
        res.status(500).json({
          message: error.rollbackFailed
            ? "Restore failed and automatic rollback was incomplete. Contact your system administrator."
            : "Unable to restore the backup. The database changes were rolled back.",
        });
      }
    } finally {
      if (releaseBackupLock) {
        try {
          await releaseBackupLock();
        } catch (error) {
          console.error("Unable to release system backup lock:", error);
        }
      }
      if (connection) {
        try {
          await connection.end();
        } catch (error) {
          console.error("Unable to close system backup database connection:", error);
        }
      }
      await cleanupWorkingDirectory(req.backupWorkingDirectory);
    }
  },
);

export default router;
