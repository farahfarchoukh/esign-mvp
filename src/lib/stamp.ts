import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface StampField {
  type: string; // SIGNATURE | CHECKBOX | TEXT | RADIO | DATE
  page: number; // 0-based
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
  value: string | null;
  optionLabel: string | null;
}

/**
 * Stamp (flatten) the given field values into the PDF bytes and return new bytes.
 *
 * Geometry is stored as normalized fractions with a TOP-LEFT origin (browser
 * convention). pdf-lib uses a BOTTOM-LEFT origin in PDF points, so we convert:
 *   x = xFrac * W
 *   drawWidth  = wFrac * W
 *   drawHeight = hFrac * H
 *   y = H - (yFrac * H) - drawHeight
 */
export async function stampFields(
  pdfBytes: Uint8Array,
  fields: StampField[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const f of fields) {
    if (f.page < 0 || f.page >= pages.length) continue;
    const page = pages[f.page];
    const { width: W, height: H } = page.getSize();

    const x = f.xFrac * W;
    const drawWidth = f.wFrac * W;
    const drawHeight = f.hFrac * H;
    const y = H - f.yFrac * H - drawHeight;

    switch (f.type) {
      case "SIGNATURE": {
        if (f.value && f.value.startsWith("data:image")) {
          try {
            const png = await pdfDoc.embedPng(f.value);
            page.drawImage(png, {
              x,
              y,
              width: drawWidth,
              height: drawHeight,
            });
          } catch {
            // ignore malformed signature image
          }
        }
        break;
      }
      case "DATE":
      case "TEXT": {
        if (f.value) {
          const size = Math.max(6, Math.min(12, drawHeight * 0.7));
          page.drawText(f.value, {
            x: x + 2,
            y: y + 2,
            size,
            font,
            color: rgb(0.05, 0.05, 0.2),
          });
        }
        break;
      }
      case "CHECKBOX": {
        // box border
        page.drawRectangle({
          x,
          y,
          width: drawWidth,
          height: drawHeight,
          borderColor: rgb(0.3, 0.3, 0.3),
          borderWidth: 1,
        });
        if (f.value === "true" || f.value === "checked" || f.value === "1") {
          const size = Math.max(8, Math.min(drawWidth, drawHeight) * 0.9);
          page.drawText("X", {
            x: x + drawWidth / 2 - size * 0.3,
            y: y + drawHeight / 2 - size * 0.35,
            size,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
        break;
      }
      case "RADIO": {
        // selected if this field's value equals its own optionLabel (set on submit)
        const selected =
          !!f.value &&
          (f.value === "true" ||
            f.value === "1" ||
            (f.optionLabel != null && f.value === f.optionLabel));
        // Draw a vector radio circle (filled when selected) — avoids any font
        // encoding issues (the previous "●" glyph isn't WinAnsi-encodable).
        const r = Math.max(2, Math.min(drawWidth, drawHeight) * 0.35);
        const cx = x + r + 2;
        const cy = y + drawHeight / 2;
        page.drawEllipse({
          x: cx,
          y: cy,
          xScale: r,
          yScale: r,
          borderColor: rgb(0.1, 0.1, 0.1),
          borderWidth: 1,
          color: selected ? rgb(0.1, 0.1, 0.1) : undefined,
        });
        if (f.optionLabel) {
          const lblSize = Math.max(6, Math.min(11, drawHeight * 0.6));
          page.drawText(f.optionLabel, {
            x: cx + r + 4,
            y: y + drawHeight / 2 - lblSize * 0.35,
            size: lblSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return pdfDoc.save();
}
