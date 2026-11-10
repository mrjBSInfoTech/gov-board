import { randomUUID } from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

const IMAGE_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
]);

export const MAX_ANNOUNCEMENT_IMAGE_SIZE = 10 * 1024 * 1024;

export const createAnnouncementImageUpload = (uploadDir) => {
  fs.mkdirSync(uploadDir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, uploadDir),
      filename: (_req, file, callback) => {
        callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: { fileSize: MAX_ANNOUNCEMENT_IMAGE_SIZE },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (IMAGE_TYPES.get(extension) !== file.mimetype.toLowerCase()) {
        return callback(
          new Error("Only JPG, PNG, GIF, and WEBP images are supported."),
        );
      }
      return callback(null, true);
    },
  });
};

export const removeAnnouncementFiles = (files = []) => {
  for (const file of files) {
    fs.unlink(file.path, (error) => {
      if (error && error.code !== "ENOENT") {
        console.error("Unable to remove announcement image:", error);
      }
    });
  }
};

export const removeAnnouncementImageNames = (uploadDir, imageNames = []) => {
  for (const imageName of imageNames) {
    if (path.basename(imageName) !== imageName || imageName.includes("\\")) continue;
    fs.unlink(path.join(uploadDir, imageName), (error) => {
      if (error && error.code !== "ENOENT") {
        console.error("Unable to remove announcement image:", error);
      }
    });
  }
};
