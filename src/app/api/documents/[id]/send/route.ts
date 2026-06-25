import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSigningInvite } from "@/lib/email";

export const runtime = "nodejs";

// POST /api/documents/[id]/send
// Ensure each recipient has a signing token, email links, set status SENT.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id;
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { recipients: true, fields: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.recipients.length === 0) {
    return NextResponse.json(
      { error: "Add at least one recipient before sending" },
      { status: 400 }
    );
  }

  // signingToken has a default cuid, so it's already populated on create.
  // Email each recipient.
  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (const r of doc.recipients) {
    try {
      await sendSigningInvite({
        to: r.email,
        recipientName: r.name,
        documentTitle: doc.title,
        token: r.signingToken,
      });
      results.push({ email: r.email, ok: true });
    } catch (e) {
      results.push({
        email: r.email,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "SENT" },
  });

  return NextResponse.json({ status: "SENT", results });
}
