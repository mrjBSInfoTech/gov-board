import { randomUUID } from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

const IMAGE_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

export const MAX_CONTRIBUTION_PROOF_SIZE = 5 * 1024 * 1024;

export const createContributionProofUpload = (uploadDir) => {
  fs.mkdirSync(uploadDir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, uploadDir),
      filename: (_req, file, callback) => {
        callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: { fileSize: MAX_CONTRIBUTION_PROOF_SIZE, files: 1 },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (IMAGE_TYPES.get(extension) !== file.mimetype.toLowerCase()) {
        return callback(new Error("Upload a JPG, PNG, or WEBP image."));
      }
      return callback(null, true);
    },
  });
};

export const removeContributionProof = (file) => {
  if (!file) return;
  fs.unlink(file.path, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Unable to remove rejected contribution proof:", error);
    }
  });
};
