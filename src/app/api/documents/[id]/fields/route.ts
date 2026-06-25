import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { FieldData, RecipientData } from "@/lib/types";

export const runtime = "nodejs";

interface Body {
  recipients: RecipientData[];
  fields: FieldData[];
}

// PUT /api/documents/[id]/fields
// Replace the document's fields and upsert recipients.
// The client refers to recipients by a temporary clientId via field.recipientId;
// we map those to real recipient ids after upserting.
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id;
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Document already sent; fields are locked" },
      { status: 400 }
    );
  }

  const body = (await req.json()) as Body;
  const recipients = body.recipients || [];
  const fields = body.fields || [];

  // Map incoming recipient identifier (id used by the client) -> real recipient id.
  const idMap = new Map<string, string>();

  // Upsert recipients: keep existing ones (by id), create new ones, delete removed.
  const existing = await prisma.recipient.findMany({ where: { documentId } });
  const keepIds = new Set<string>();

  for (const r of recipients) {
    if (r.id && existing.some((e) => e.id === r.id)) {
      const updated = await prisma.recipient.update({
        where: { id: r.id },
        data: { name: r.name, email: r.email },
      });
      idMap.set(r.id, updated.id);
      keepIds.add(updated.id);
    } else {
      const created = await prisma.recipient.create({
        data: { documentId, name: r.name, email: r.email },
      });
      // client may have referenced this recipient by its temp id
      if (r.id) idMap.set(r.id, created.id);
      idMap.set(created.id, created.id);
      keepIds.add(created.id);
    }
  }

  // Remove recipients no longer present.
  const toDelete = existing.filter((e) => !keepIds.has(e.id)).map((e) => e.id);
  if (toDelete.length > 0) {
    await prisma.recipient.deleteMany({ where: { id: { in: toDelete } } });
  }

  // Replace all fields.
  await prisma.field.deleteMany({ where: { documentId } });

  if (fields.length > 0) {
    await prisma.field.createMany({
      data: fields.map((f) => ({
        documentId,
        recipientId:
          f.recipientId && idMap.has(f.recipientId)
            ? idMap.get(f.recipientId)!
            : f.recipientId && keepIds.has(f.recipientId)
            ? f.recipientId
            : null,
        type: f.type,
        page: f.page,
        xFrac: f.xFrac,
        yFrac: f.yFrac,
        wFrac: f.wFrac,
        hFrac: f.hFrac,
        value: f.value ?? null,
        required: f.required ?? true,
        groupName: f.groupName ?? null,
        optionLabel: f.optionLabel ?? null,
        autoFill: f.autoFill ?? null,
      })),
    });
  }

  const updated = await prisma.document.findUnique({
    where: { id: documentId },
    include: { recipients: { orderBy: { name: "asc" } }, fields: true },
  });
  return NextResponse.json(updated);
}
