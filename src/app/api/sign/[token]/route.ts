import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fileExists,
  originalPathFor,
  readFileBytes,
  signedPathFor,
  writeFileBytes,
} from "@/lib/storage";
import { stampFields, type StampField } from "@/lib/stamp";
import { sendCompletedNotice } from "@/lib/email";

export const runtime = "nodejs";

// GET /api/sign/[token] — recipient + document + that recipient's fields.
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const recipient = await prisma.recipient.findUnique({
    where: { signingToken: params.token },
    include: { document: true },
  });
  if (!recipient) {
    return NextResponse.json({ error: "Invalid signing link" }, { status: 404 });
  }

  const fields = await prisma.field.findMany({
    where: { documentId: recipient.documentId, recipientId: recipient.id },
  });

  // Resolve auto-fill fields so the signing UI shows them pre-filled (read-only).
  const today = todayStr();
  const resolvedFields = fields.map((f) => {
    if (f.autoFill) {
      return { ...f, value: resolveAutoFill(f.autoFill, recipient, today) };
    }
    return f;
  });

  return NextResponse.json({
    recipient: {
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      status: recipient.status,
      signedAt: recipient.signedAt,
      signingToken: recipient.signingToken,
    },
    document: {
      id: recipient.document.id,
      title: recipient.document.title,
      status: recipient.document.status,
    },
    fields: resolvedFields,
  });
}

// Today's date as YYYY-MM-DD (local).
function todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Resolve an autoFill code to its authoritative value.
function resolveAutoFill(
  autoFill: string,
  recipient: { name: string; email: string },
  today: string
): string {
  switch (autoFill) {
    case "NAME":
      return recipient.name;
    case "EMAIL":
      return recipient.email;
    case "DATE":
      return today;
    default:
      return "";
  }
}

interface SubmitBody {
  // map of fieldId -> value (string). For SIGNATURE this is a PNG dataURL,
  // CHECKBOX "true"/"false", TEXT the text, RADIO the chosen optionLabel.
  values: Record<string, string>;
}

// POST /api/sign/[token] — persist values, mark SIGNED, stamp into the PDF,
// complete the doc if everyone has signed.
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const recipient = await prisma.recipient.findUnique({
    where: { signingToken: params.token },
    include: { document: true },
  });
  if (!recipient) {
    return NextResponse.json({ error: "Invalid signing link" }, { status: 404 });
  }
  if (recipient.status === "SIGNED") {
    return NextResponse.json(
      { error: "You have already signed this document" },
      { status: 400 }
    );
  }

  const body = (await req.json()) as SubmitBody;
  const values = body.values || {};

  const myFields = await prisma.field.findMany({
    where: { documentId: recipient.documentId, recipientId: recipient.id },
  });

  // Validate required fields.
  // Radio: at least one option per groupName must be selected.
  const missing: string[] = [];
  const radioGroupsSatisfied = new Map<string, boolean>();
  for (const f of myFields) {
    if (f.type === "RADIO" && f.groupName) {
      if (!radioGroupsSatisfied.has(f.groupName)) {
        radioGroupsSatisfied.set(f.groupName, false);
      }
      const chosen = values[`group:${f.groupName}`];
      if (chosen && chosen === f.optionLabel) {
        radioGroupsSatisfied.set(f.groupName, true);
      }
      continue;
    }
    // Auto-fill fields are populated server-side, so they're always satisfied.
    if (f.autoFill) continue;
    if (!f.required) continue;
    const v = values[f.id];
    if (f.type === "CHECKBOX") {
      if (v !== "true") missing.push(f.id);
    } else if (!v || v.trim() === "") {
      // TEXT and DATE both require a non-empty value.
      missing.push(f.id);
    }
  }
  radioGroupsSatisfied.forEach((ok, group) => {
    const required = myFields.some(
      (f) => f.type === "RADIO" && f.groupName === group && f.required
    );
    if (required && !ok) missing.push(`group:${group}`);
  });

  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Please complete all required fields", missing },
      { status: 400 }
    );
  }

  // Persist values onto each field row.
  const today = todayStr();
  for (const f of myFields) {
    let stored: string | null = null;
    if (f.autoFill) {
      // Authoritative server-side value; ignore anything the client sent.
      stored = resolveAutoFill(f.autoFill, recipient, today);
    } else if (f.type === "RADIO" && f.groupName) {
      const chosen = values[`group:${f.groupName}`];
      stored = chosen === f.optionLabel ? f.optionLabel : null;
    } else {
      stored = values[f.id] ?? null;
    }
    await prisma.field.update({ where: { id: f.id }, data: { value: stored } });
  }

  // Stamp this recipient's values into the working signed PDF (cumulative).
  // Start from the existing signed PDF if present, else the original.
  const originalPath = recipient.document.originalPath || originalPathFor(recipient.documentId);
  const signedPath = recipient.document.signedPath || signedPathFor(recipient.documentId);
  const basePath = fileExists(signedPath) ? signedPath : originalPath;

  if (fileExists(basePath)) {
    const baseBytes = readFileBytes(basePath);
    const refreshed = await prisma.field.findMany({
      where: { documentId: recipient.documentId, recipientId: recipient.id },
    });
    const stampInput: StampField[] = refreshed
      .filter((f) => f.value != null && f.value !== "")
      .map((f) => ({
        type: f.type,
        page: f.page,
        xFrac: f.xFrac,
        yFrac: f.yFrac,
        wFrac: f.wFrac,
        hFrac: f.hFrac,
        value: f.value,
        optionLabel: f.optionLabel,
      }));
    const stamped = await stampFields(new Uint8Array(baseBytes), stampInput);
    writeFileBytes(signedPath, stamped);
    if (!recipient.document.signedPath) {
      await prisma.document.update({
        where: { id: recipient.documentId },
        data: { signedPath },
      });
    }
  }

  // Mark SIGNED only AFTER stamping succeeds, so a stamping failure can't leave
  // the recipient stuck as "signed" with an unstamped PDF.
  await prisma.recipient.update({
    where: { id: recipient.id },
    data: { status: "SIGNED", signedAt: new Date() },
  });

  // Are all recipients signed now?
  const all = await prisma.recipient.findMany({
    where: { documentId: recipient.documentId },
  });
  const allSigned = all.every((r) => r.status === "SIGNED");

  if (allSigned) {
    // Rebuild a clean final stamp from original with ALL signed values, to be safe.
    const original = recipient.document.originalPath || originalPathFor(recipient.documentId);
    if (fileExists(original)) {
      const allFields = await prisma.field.findMany({
        where: { documentId: recipient.documentId },
      });
      const stampInput: StampField[] = allFields
        .filter((f) => f.value != null && f.value !== "")
        .map((f) => ({
          type: f.type,
          page: f.page,
          xFrac: f.xFrac,
          yFrac: f.yFrac,
          wFrac: f.wFrac,
          hFrac: f.hFrac,
          value: f.value,
          optionLabel: f.optionLabel,
        }));
      const finalBytes = await stampFields(
        new Uint8Array(readFileBytes(original)),
        stampInput
      );
      writeFileBytes(signedPath, finalBytes);
    }

    await prisma.document.update({
      where: { id: recipient.documentId },
      data: { status: "COMPLETED", signedPath },
    });

    try {
      await sendCompletedNotice({
        to: recipient.document.senderEmail,
        documentTitle: recipient.document.title,
        documentId: recipient.documentId,
      });
    } catch {
      // best effort; don't fail the signing
    }
  }

  return NextResponse.json({ status: "SIGNED", completed: allSigned });
}
