import fs from "fs";
import path from "path";

// All uploaded + signed PDFs live under ./uploads (gitignored).
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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
