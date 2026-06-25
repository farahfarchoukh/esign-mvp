import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fileExists,
  originalPathFor,
  readFileBytes,
  signedPathFor,
} from "@/lib/storage";

export const runtime = "nodejs";

// GET /api/documents/[id]/download — stream the signed PDF (falls back to
// original if no signed version exists yet).
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id;
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signed = doc.signedPath || signedPathFor(documentId);
  const path = fileExists(signed) ? signed : doc.originalPath || originalPathFor(documentId);

  if (!fileExists(path)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const bytes = readFileBytes(path);
  const filename = `${doc.title.replace(/[^a-z0-9-_]+/gi, "_")}-signed.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
