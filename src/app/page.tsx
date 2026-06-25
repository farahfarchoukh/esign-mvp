import { prisma } from "@/lib/prisma";
import UploadZone from "@/components/UploadZone";
import Link from "next/link";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-200 text-slate-700",
    SENT: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-green-100 text-green-800",
  };
  return map[status] || "bg-slate-200 text-slate-700";
}

export default async function HomePage() {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { recipients: true },
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-1">Upload a PDF to sign</h1>
        <p className="text-slate-600 mb-4 text-sm">
          Drag &amp; drop a PDF (or click to browse). You&apos;ll place fields,
          add recipients, and send for signature.
        </p>
        <UploadZone />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your documents</h2>
        {docs.length === 0 ? (
          <p className="text-slate-500 text-sm">No documents yet.</p>
        ) : (
          <div className="overflow-hidden rounded border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Recipients</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const signed = d.recipients.filter(
                    (r) => r.status === "SIGNED"
                  ).length;
                  return (
                    <tr key={d.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{d.title}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadge(
                            d.status
                          )}`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {signed}/{d.recipients.length} signed
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right space-x-3">
                        {d.status === "DRAFT" && (
                          <Link
                            href={`/documents/${d.id}/edit`}
                            className="font-medium text-brand-blue hover:underline"
                          >
                            Edit
                          </Link>
                        )}
                        {(d.status === "SENT" || d.status === "COMPLETED") && (
                          <a
                            href={`/api/documents/${d.id}/download`}
                            className="font-medium text-brand-orangedark hover:underline"
                          >
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
