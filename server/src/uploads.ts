// Photo uploads. Development: saved on disk under server/uploads (served at /uploads).
// Phase 6 (deployment) swaps this for Cloudinary without changing the routes.
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(path.join(UPLOAD_DIR, "listings"), { recursive: true });

const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

export const listingPhotos = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_DIR, "listings"),
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
}).array("photos", 4);

export const photoUrl = (filename: string) => "/uploads/listings/" + filename;

// Vehicle registration documents (admin checks them)
fs.mkdirSync(path.join(UPLOAD_DIR, "docs"), { recursive: true });
export const vehicleDoc = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_DIR, "docs"),
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
}).single("doc");
// private: served through /api/files/docs/:name to the owner and admins only (not the public /uploads)
export const docUrl = (filename: string) => "/api/files/docs/" + filename;

// Delivery-failure photo proof (admins + people in the deal only)
fs.mkdirSync(path.join(UPLOAD_DIR, "failures"), { recursive: true });
export const failurePhoto = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_DIR, "failures"),
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
}).single("photo");
export const failureUrl = (filename: string) => "/api/files/failures/" + filename;

// Identity / licence documents for verification (owner + admins only)
fs.mkdirSync(path.join(UPLOAD_DIR, "ids"), { recursive: true });
export const idDoc = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_DIR, "ids"),
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
}).single("file");
export const idUrl = (filename: string) => "/api/files/ids/" + filename;

// Profile pictures (public, like listing photos; the browser shrinks them first)
fs.mkdirSync(path.join(UPLOAD_DIR, "avatars"), { recursive: true });
export const avatarPhoto = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_DIR, "avatars"),
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
}).single("photo");

// ---------------------------------------------------------------- storage: local disk or Cloudinary
// Development: files stay in server/uploads. Production: set CLOUDINARY_URL and files go to Cloudinary
// (the server's own disk is wiped on every deploy). Private files keep the same /api/files/... address;
// the server checks permission, then redirects to a Cloudinary download link that expires in 5 minutes.
import { v2 as cloudinary } from "cloudinary";
import type { Response } from "express";
export const useCloud = !!process.env.CLOUDINARY_URL; // the SDK reads CLOUDINARY_URL itself
type Kind = "listings" | "avatars" | "docs" | "ids" | "failures";

/** Stores an uploaded file and returns the address saved in the database. */
export async function keep(file: Express.Multer.File, kind: Kind): Promise<string> {
  const priv = kind !== "listings" && kind !== "avatars";
  const local = priv ? `/api/files/${kind}/${file.filename}` : `/uploads/${kind}/${file.filename}`;
  if (!useCloud) return local;
  const r = await cloudinary.uploader.upload(file.path, { folder: "freshnest/" + kind, public_id: file.filename.replace(/\.\w+$/, ""), type: priv ? "authenticated" : "upload", resource_type: "image" });
  fs.rm(file.path, () => {});
  return priv ? local : r.secure_url;
}

/** Sends a private file (permission already checked by the caller). */
export function sendPrivate(res: Response, kind: Exclude<Kind, "listings" | "avatars">, name: string) {
  if (!useCloud) return res.sendFile(path.join(UPLOAD_DIR, kind, name));
  const [base, ext] = name.split(".");
  res.redirect(cloudinary.utils.private_download_url(`freshnest/${kind}/${base}`, ext, { type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 300 }));
}
