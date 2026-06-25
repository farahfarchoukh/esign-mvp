// Generates a branded CORE Cashless "Service Agreement" sample PDF to demo the
// e-signature flow. Run: node scripts/generate-sample.mjs
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";

const BLUE = rgb(0.161, 0.502, 0.725); // #2980B9
const ORANGE = rgb(0.973, 0.580, 0.024); // #F89406
const DARK = rgb(0.06, 0.09, 0.16);
const GRAY = rgb(0.35, 0.4, 0.46);

const MARGIN = 56;
const WIDTH = 612; // US Letter
const HEIGHT = 792;

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);

function wrap(text, f, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (f.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function header(page) {
  // top brand bar
  page.drawRectangle({ x: 0, y: HEIGHT - 8, width: WIDTH, height: 8, color: ORANGE });
  page.drawText("CORE", { x: MARGIN, y: HEIGHT - 46, size: 22, font: bold, color: ORANGE });
  const coreW = bold.widthOfTextAtSize("CORE", 22);
  page.drawText(" Cashless", { x: MARGIN + coreW, y: HEIGHT - 46, size: 22, font: bold, color: BLUE });
  page.drawText("Cashless payments that make every experience priceless", {
    x: MARGIN,
    y: HEIGHT - 60,
    size: 8.5,
    font,
    color: GRAY,
  });
  page.drawLine({
    start: { x: MARGIN, y: HEIGHT - 72 },
    end: { x: WIDTH - MARGIN, y: HEIGHT - 72 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });
}

function para(page, y, text, { size = 10.5, f = font, color = DARK, gap = 4 } = {}) {
  const lines = wrap(text, f, size, WIDTH - MARGIN * 2);
  let yy = y;
  for (const ln of lines) {
    page.drawText(ln, { x: MARGIN, y: yy, size, font: f, color });
    yy -= size + gap;
  }
  return yy;
}

function heading(page, y, text) {
  page.drawText(text, { x: MARGIN, y, size: 12.5, font: bold, color: BLUE });
  return y - 18;
}

// ---------- Page 1 ----------
const p1 = doc.addPage([WIDTH, HEIGHT]);
header(p1);

let y = HEIGHT - 100;
p1.drawText("Cashless Services Agreement", { x: MARGIN, y, size: 18, font: bold, color: DARK });
y -= 14;
p1.drawText("Agreement No. CC-2026-0001", { x: MARGIN, y: y, size: 9, font, color: GRAY });
y -= 26;

y = para(
  p1,
  y,
  "This Cashless Services Agreement (the \"Agreement\") is entered into between CORE Cashless, LLC (\"Provider\") and the undersigned client (\"Client\") for the provision of cashless payment, point-of-sale, and access-control services at the Client's events and venues."
);
y -= 10;

y = heading(p1, y, "1. Services");
y = para(
  p1,
  y,
  "Provider will supply cashless wristbands/cards, POS terminals, kiosks, and the CORE Cashless platform for transaction processing, top-ups, and refunds, together with integrations to the Client's ticketing and payment-gateway systems."
);
y -= 10;

y = heading(p1, y, "2. Term & Fees");
y = para(
  p1,
  y,
  "The Agreement begins on the activation date and remains in effect for the duration of the engagement. Fees comprise a per-transaction processing rate plus hardware rental, invoiced per event and payable within thirty (30) days."
);
y -= 10;

y = heading(p1, y, "3. Plan Selection");
y = para(p1, y, "Please indicate the service plan you wish to activate (select one):", { size: 10 });
y -= 6;
p1.drawText("Standard  —  core cashless processing and standard support", { x: MARGIN + 24, y, size: 10, font, color: DARK });
y -= 18;
p1.drawText("Premium  —  priority support, advanced analytics, and dedicated onboarding", { x: MARGIN + 24, y, size: 10, font, color: DARK });
y -= 26;

y = heading(p1, y, "4. Acknowledgements");
y = para(
  p1,
  y,
  "By signing, the Client acknowledges it has reviewed the service scope and fee schedule and agrees to the terms set out in this Agreement and its appendices."
);
y -= 6;
p1.drawText("I have read and agree to the terms of this Agreement.", { x: MARGIN + 24, y, size: 10, font, color: DARK });

p1.drawText("Page 1 of 2", { x: WIDTH - MARGIN - 50, y: 36, size: 8, font, color: GRAY });

// ---------- Page 2 ----------
const p2 = doc.addPage([WIDTH, HEIGHT]);
header(p2);
y = HEIGHT - 100;
y = heading(p2, y, "5. Authorization & Signature");
y = para(
  p2,
  y,
  "The individuals below are authorized to execute this Agreement on behalf of the Client. Electronic signatures are deemed valid and binding."
);
y -= 30;

// Signature block labels (the app's fields get placed near these)
p2.drawText("Client Signature:", { x: MARGIN, y, size: 10, font: bold, color: DARK });
p2.drawLine({ start: { x: MARGIN + 110, y: y - 2 }, end: { x: MARGIN + 320, y: y - 2 }, thickness: 1, color: GRAY });
y -= 40;

p2.drawText("Full Name:", { x: MARGIN, y, size: 10, font: bold, color: DARK });
p2.drawLine({ start: { x: MARGIN + 110, y: y - 2 }, end: { x: MARGIN + 320, y: y - 2 }, thickness: 1, color: GRAY });
y -= 40;

p2.drawText("Title:", { x: MARGIN, y, size: 10, font: bold, color: DARK });
p2.drawLine({ start: { x: MARGIN + 110, y: y - 2 }, end: { x: MARGIN + 320, y: y - 2 }, thickness: 1, color: GRAY });
y -= 40;

p2.drawText("Date:", { x: MARGIN, y, size: 10, font: bold, color: DARK });
p2.drawLine({ start: { x: MARGIN + 110, y: y - 2 }, end: { x: MARGIN + 250, y: y - 2 }, thickness: 1, color: GRAY });
y -= 50;

p2.drawText("Consent:", { x: MARGIN, y, size: 10, font: bold, color: DARK });
p2.drawText("I consent to the use of electronic signatures.", { x: MARGIN + 110, y, size: 10, font, color: DARK });

p2.drawText("Powered by CORE Cashless  -  e-Sign", { x: MARGIN, y: 36, size: 8, font, color: GRAY });
p2.drawText("Page 2 of 2", { x: WIDTH - MARGIN - 50, y: 36, size: 8, font, color: GRAY });

const bytes = await doc.save();
const outDir = path.resolve("samples");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "CORE-Cashless-Service-Agreement.pdf");
fs.writeFileSync(outPath, bytes);
console.log(`Sample PDF written to ${outPath} (${bytes.length} bytes)`);
