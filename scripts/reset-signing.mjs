// Resets signing state so you can re-test: any SIGNED recipients go back to
// PENDING, and any COMPLETED documents go back to SENT.
// Run: node scripts/reset-signing.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const r = await prisma.recipient.updateMany({
  where: { status: "SIGNED" },
  data: { status: "PENDING", signedAt: null },
});
const d = await prisma.document.updateMany({
  where: { status: "COMPLETED" },
  data: { status: "SENT" },
});

console.log(`Reset ${r.count} recipient(s) -> PENDING, ${d.count} document(s) -> SENT.`);
await prisma.$disconnect();
