"use client";

import { useEffect, useMemo, useState } from "react";
import { Document, Page } from "react-pdf";
import "../components/pdfSetup";
import SignatureModal from "./SignatureModal";
import type { FieldData } from "@/lib/types";

const PAGE_WIDTH = 720;

interface SignField extends FieldData {
  id: string;
}

interface LoadedData {
  recipient: { id: string; name: string; email: string; status: string };
  document: { id: string; title: string; status: string };
  fields: SignField[];
}

export default function SignView({ token }: { token: string }) {
  const [data, setData] = useState<LoadedData | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sigTarget, setSigTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const fileUrl = `/api/documents/${data?.document.id}/file?token=${token}`;

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/sign/${token}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Invalid signing link");
        return;
      }
      const d = (await res.json()) as LoadedData;
      setData(d);
      // Pre-fill any values the sender already entered (e.g. information/text
      // fields) so the signer doesn't have to retype them.
      const initial: Record<string, string> = {};
      for (const f of d.fields) {
        if (f.value != null && f.value !== "") {
          if (f.type === "TEXT" || f.type === "CHECKBOX" || f.type === "DATE") {
            initial[f.id] = f.value;
          } else if (f.type === "RADIO" && f.groupName) {
            initial[`group:${f.groupName}`] = f.value;
          }
        }
      }
      if (Object.keys(initial).length > 0) setValues(initial);
      if (d.recipient.status === "SIGNED") setDone(true);
    })();
  }, [token]);

  // group radio fields by groupName for rendering & value handling
  const radioGroups = useMemo(() => {
    const map = new Map<string, SignField[]>();
    if (!data) return map;
    for (const f of data.fields) {
      if (f.type === "RADIO" && f.groupName) {
        const arr = map.get(f.groupName) || [];
        arr.push(f);
        map.set(f.groupName, arr);
      }
    }
    return map;
  }, [data]);

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setMissing((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.missing && Array.isArray(j.missing)) {
          setMissing(new Set(j.missing));
        }
        throw new Error(j.error || "Submission failed");
      }
      const j = await res.json();
      setDone(true);
      setCompleted(!!j.completed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !data) {
    return <p className="text-red-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-slate-500">Loading…</p>;
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded border bg-white p-6 text-center">
        <h1 className="mb-2 text-xl font-bold text-brand-blue">
          Thank you, {data.recipient.name}!
        </h1>
        <p className="text-slate-600">
          Your signature for <strong>{data.document.title}</strong> has been
          recorded.
        </p>
        {completed && (
          <p className="mt-2 text-sm text-slate-500">
            All recipients have signed — the sender has been emailed the final
            signed PDF.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-bold">{data.document.title}</h1>
        <p className="text-sm text-slate-600">
          Signing as <strong>{data.recipient.name}</strong> ({data.recipient.email}).
          Complete the highlighted fields, then submit.
        </p>
      </div>

      <div className="rounded border bg-slate-100 p-4">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p className="text-slate-500">Loading PDF…</p>}
          error={<p className="text-red-600">Failed to load PDF.</p>}
        >
          {Array.from({ length: numPages }, (_, i) => i).map((pageIndex) => (
            <div key={pageIndex} className="relative mx-auto mb-6 w-fit">
              <div className="relative">
                <Page
                  pageNumber={pageIndex + 1}
                  width={PAGE_WIDTH}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
                {data.fields
                  .filter((f) => f.page === pageIndex)
                  .map((f) => (
                    <FieldInput
                      key={f.id}
                      field={f}
                      value={
                        f.type === "RADIO" && f.groupName
                          ? values[`group:${f.groupName}`] || ""
                          : values[f.id] || ""
                      }
                      invalid={
                        missing.has(f.id) ||
                        (f.type === "RADIO" &&
                          !!f.groupName &&
                          missing.has(`group:${f.groupName}`))
                      }
                      onText={(v) => setValue(f.id, v)}
                      onCheckbox={(v) => setValue(f.id, v ? "true" : "false")}
                      onRadio={() =>
                        f.groupName &&
                        setValue(`group:${f.groupName}`, f.optionLabel || f.id)
                      }
                      onSignClick={() => setSigTarget(f.id)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </Document>
      </div>

      {radioGroups.size > 0 && (
        <p className="text-xs text-slate-500">
          Radio options are grouped; selecting one option clears the others in
          its group.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="sticky bottom-0 flex justify-end gap-3 rounded border bg-white p-4 shadow">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded bg-brand-orange px-6 py-2 font-medium text-white hover:bg-brand-orangedark disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Sign & Submit"}
        </button>
      </div>

      {sigTarget && (
        <SignatureModal
          onClose={() => setSigTarget(null)}
          onSave={(dataUrl) => {
            setValue(sigTarget, dataUrl);
            setSigTarget(null);
          }}
        />
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  invalid,
  onText,
  onCheckbox,
  onRadio,
  onSignClick,
}: {
  field: SignField;
  value: string;
  invalid: boolean;
  onText: (v: string) => void;
  onCheckbox: (v: boolean) => void;
  onRadio: () => void;
  onSignClick: () => void;
}) {
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${field.xFrac * 100}%`,
    top: `${field.yFrac * 100}%`,
    width: `${field.wFrac * 100}%`,
    height: `${field.hFrac * 100}%`,
    boxSizing: "border-box",
  };
  const ring = invalid ? "2px solid #dc2626" : "2px solid #2980B9";

  if (field.type === "SIGNATURE") {
    const signed = value.startsWith("data:image");
    return (
      <div style={{ ...baseStyle, border: ring, background: "#dbeafe88" }}>
        {field.required && <RequiredStar />}
        {signed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="signature"
            onClick={onSignClick}
            className="h-full w-full cursor-pointer object-contain"
          />
        ) : (
          <button
            onClick={onSignClick}
            className="h-full w-full text-[11px] font-medium text-brand-blue"
          >
            Click to sign
          </button>
        )}
      </div>
    );
  }

  if (field.type === "TEXT" || field.type === "DATE") {
    const auto = !!field.autoFill;
    return (
      <div style={baseStyle} className="relative">
        {field.required && <RequiredStar />}
        <input
          type={field.type === "DATE" ? "date" : "text"}
          value={value}
          onChange={(e) => onText(e.target.value)}
          disabled={auto}
          placeholder={field.type === "DATE" ? "" : "Type here"}
          style={{
            width: "100%",
            height: "100%",
            border: ring,
            fontSize: 11,
            padding: "0 4px",
            boxSizing: "border-box",
          }}
          className={auto ? "bg-slate-100 text-slate-600" : "bg-white/90"}
        />
      </div>
    );
  }

  if (field.type === "CHECKBOX") {
    return (
      <div
        style={{ ...baseStyle, border: ring, background: "#dbeafe88" }}
        className="flex items-center justify-center"
      >
        {field.required && <RequiredStar />}
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onCheckbox(e.target.checked)}
          className="h-full w-full cursor-pointer"
        />
      </div>
    );
  }

  // RADIO
  const selected = value && field.optionLabel === value;
  return (
    <label
      style={{ ...baseStyle, border: ring, background: "#dbeafe88" }}
      className="flex cursor-pointer items-center gap-1 px-1 text-[11px]"
    >
      {field.required && <RequiredStar />}
      <input
        type="radio"
        name={field.groupName || field.id}
        checked={!!selected}
        onChange={onRadio}
      />
      <span className="truncate">{field.optionLabel}</span>
    </label>
  );
}

// Required indicator is shown in the field list, not stamped onto each field box.
function RequiredStar() {
  return null;
}
