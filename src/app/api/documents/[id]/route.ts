import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/documents/[id] — document + fields + recipients
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      recipients: { orderBy: { name: "asc" } },
      fields: true,
    },
  });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(doc);
}
