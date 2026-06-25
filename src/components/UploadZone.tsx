"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

export default function UploadZone() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [senderEmail, setSenderEmail] = useState("");

  const onDrop = useCallback(
    async (accepted: File[]) => {
      setError(null);
      const file = accepted[0];
      if (!file) return;
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("senderEmail", senderEmail || "sender@example.com");
        const res = await fetch("/api/documents", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Upload failed");
        }
        const { id } = await res.json();
        router.push(`/documents/${id}/edit`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setUploading(false);
      }
    },
    [router, senderEmail]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Your email (sender — gets the completed PDF link)
        </label>
        <input
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full max-w-md rounded border px-3 py-2 text-sm"
        />
      </div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-12 text-center transition ${
          isDragActive
            ? "border-brand-blue bg-brand-blue/5"
            : "border-slate-300 bg-white hover:border-brand-blue"
        } ${uploading ? "opacity-60" : ""}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="text-slate-600">Uploading…</p>
        ) : isDragActive ? (
          <p className="text-brand-blue font-medium">Drop the PDF here…</p>
        ) : (
          <p className="text-slate-600">
            Drag &amp; drop a PDF here, or click to browse
          </p>
        )}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
