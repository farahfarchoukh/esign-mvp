import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fileExists, originalPathFor, readFileBytes } from "@/lib/storage";

export const runtime = "nodejs";

// GET /api/documents/[id]/file?token=...
// Streams the original PDF bytes for react-pdf.
// If a valid recipient token is supplied it is allowed even without other auth
// (this MVP has no auth; the token guard is here for the signing page).
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id;
  const token = req.nextUrl.searchParams.get("token");

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (token) {
    const recipient = await prisma.recipient.findUnique({
      where: { signingToken: token },
    });
    if (!recipient || recipient.documentId !== documentId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }
  }

  const path = doc.originalPath || originalPathFor(documentId);
  if (!fileExists(path)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const bytes = readFileBytes(path);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      "Cache-Control": "no-store",
    },
  });
}
