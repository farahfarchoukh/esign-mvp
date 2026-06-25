import fs from "fs";
import path from "path";

// All uploaded + signed PDFs live under ./uploads (gitignored) by default.
// On a hosted deployment set UPLOAD_DIR to a path on a persistent volume
// (e.g. /data/uploads) so files survive restarts and redeploys.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function originalPathFor(docId: string) {
  return path.join(UPLOAD_DIR, `${docId}.pdf`);
}

export function signedPathFor(docId: string) {
  return path.join(UPLOAD_DIR, `${docId}-signed.pdf`);
}

export function readFileBytes(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

export function writeFileBytes(filePath: string, bytes: Uint8Array) {
  ensureUploadDir();
  fs.writeFileSync(filePath, bytes);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
