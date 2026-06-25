import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUploadDir, originalPathFor, writeFileBytes } from "@/lib/storage";

export const runtime = "nodejs";

// GET /api/documents — list documents for the home page
export async function GET() {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      recipients: true,
      _count: { select: { fields: true } },
    },
  });
  return NextResponse.json(docs);
}

// POST /api/documents — multipart upload, create Document (DRAFT)
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const senderEmail = (form.get("senderEmail") as string) || "";

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const blob = file as File;
  if (!blob.name.toLowerCase().endsWith(".pdf") && blob.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  const title = blob.name.replace(/\.pdf$/i, "") || "Untitled document";

  // Create the row first so we can name the file by id.
  const doc = await prisma.document.create({
    data: {
      title,
      originalPath: "", // set after we know the id
      status: "DRAFT",
      senderEmail: senderEmail || "sender@example.com",
    },
  });

  ensureUploadDir();
  const dest = originalPathFor(doc.id);
  const bytes = Buffer.from(await blob.arrayBuffer());
  writeFileBytes(dest, bytes);

  await prisma.document.update({
    where: { id: doc.id },
    data: { originalPath: dest },
  });

  return NextResponse.json({ id: doc.id });
}
