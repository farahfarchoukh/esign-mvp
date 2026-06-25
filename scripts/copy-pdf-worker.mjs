// Copies the pdf.js worker from pdfjs-dist into /public so it can be served as
// a static asset (avoids bundling the .mjs worker, which breaks the build).
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(root, "public");
const dest = join(destDir, "pdf.worker.min.mjs");

try {
  if (!existsSync(src)) {
    console.warn(`[copy-pdf-worker] source not found: ${src} (skipping)`);
    process.exit(0);
  }
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  console.log(`[copy-pdf-worker] copied worker -> public/pdf.worker.min.mjs`);
} catch (e) {
  console.warn(`[copy-pdf-worker] failed: ${e?.message || e}`);
}
