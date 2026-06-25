"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "../components/pdfSetup";
import type { FieldData, FieldType, RecipientData } from "@/lib/types";

// ---- helpers -------------------------------------------------------------

let counter = 0;
function tempId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

const FIELD_COLORS = [
  "#2563eb",
  "#16a34a",
  "#db2777",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

const PAGE_WIDTH = 720; // rendered page width in px

interface EditorField extends FieldData {
  id: string; // always present in the editor (temp or real)
}

interface EditorRecipient extends RecipientData {
  id: string;
}

// ---- component -----------------------------------------------------------

export default function Editor({ documentId }: { documentId: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<Record<number, { w: number; h: number }>>(
    {}
  );
  const [fields, setFields] = useState<EditorField[]>([]);
  const [recipients, setRecipients] = useState<EditorRecipient[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<FieldType | null>(null);
  const [status, setStatus] = useState<string>("DRAFT");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fileUrl = `/api/documents/${documentId}/file`;

  // Load existing document state.
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) {
        setMessage("Failed to load document");
        return;
      }
      const doc = await res.json();
      setTitle(doc.title);
      setStatus(doc.status);
      const recs: EditorRecipient[] = (doc.recipients || []).map(
        (r: { id: string; name: string; email: string }) => ({
          id: r.id,
          name: r.name,
          email: r.email,
        })
      );
      setRecipients(recs);
      if (recs.length > 0) setActiveRecipientId(recs[0].id);
      const flds: EditorField[] = (doc.fields || []).map(
        (f: FieldData & { id: string }) => ({
          ...f,
          id: f.id,
        })
      );
      setFields(flds);
      setLoaded(true);
    })();
  }, [documentId]);

  const recipientColor = useCallback(
    (rid: string | null) => {
      if (!rid) return "#94a3b8";
      const idx = recipients.findIndex((r) => r.id === rid);
      return FIELD_COLORS[idx % FIELD_COLORS.length] || "#94a3b8";
    },
    [recipients]
  );

  // ---- recipient management ----
  function addRecipient() {
    const id = tempId("rec");
    const r: EditorRecipient = { id, name: "", email: "" };
    setRecipients((prev) => [...prev, r]);
    setActiveRecipientId(id);
  }
  function updateRecipient(id: string, patch: Partial<EditorRecipient>) {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRecipient(id: string) {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    setFields((prev) =>
      prev.map((f) => (f.recipientId === id ? { ...f, recipientId: null } : f))
    );
    if (activeRecipientId === id) setActiveRecipientId(null);
  }

  // ---- placing a field by clicking on a page ----
  function handlePageClick(
    e: React.MouseEvent<HTMLDivElement>,
    page: number
  ) {
    if (!activeTool) return;
    if (!activeRecipientId) {
      setMessage("Add and select a recipient before placing fields.");
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;

    // default sizes (fractions) per type
    const defaults: Record<FieldType, { w: number; h: number }> = {
      SIGNATURE: { w: 0.22, h: 0.06 },
      TEXT: { w: 0.2, h: 0.035 },
      DATE: { w: 0.18, h: 0.035 },
      CHECKBOX: { w: 0.03, h: 0.025 },
      RADIO: { w: 0.16, h: 0.03 },
    };
    const d = defaults[activeTool];

    const newField: EditorField = {
      id: tempId("fld"),
      recipientId: activeRecipientId,
      type: activeTool,
      page,
      xFrac: Math.min(Math.max(xFrac, 0), 1 - d.w),
      yFrac: Math.min(Math.max(yFrac, 0), 1 - d.h),
      wFrac: d.w,
      hFrac: d.h,
      value: null,
      required: true,
      groupName: activeTool === "RADIO" ? "group1" : null,
      optionLabel: activeTool === "RADIO" ? "Option" : null,
      autoFill: null,
    };
    setFields((prev) => [...prev, newField]);
    // Tool stays selected so you can place multiple fields (incl. across pages).
    // Clicking an existing field moves it instead of duplicating (handled in FieldBox).
  }

  function updateField(id: string, patch: Partial<EditorField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  // ---- one-click sample layout for the bundled 2-page agreement ----
  function autoPlaceSampleFields() {
    if (!activeRecipientId) {
      setMessage("Select a recipient before auto-placing fields.");
      return;
    }
    const rid = activeRecipientId;
    const samples: Array<Omit<EditorField, "id" | "recipientId">> = [
      // Page 2 (index 1) — signature block.
      // Coords derived from the sample PDF layout (US-Letter 612x792 pt,
      // top-left fractions): label underlines at pdf y≈613/573/493, consent text y≈445.
      {
        type: "SIGNATURE",
        page: 1,
        xFrac: 0.271,
        yFrac: 0.164,
        wFrac: 0.343,
        hFrac: 0.057,
        value: null,
        required: true,
        groupName: null,
        optionLabel: null,
        autoFill: null,
      },
      {
        type: "TEXT",
        page: 1,
        xFrac: 0.271,
        yFrac: 0.245,
        wFrac: 0.3,
        hFrac: 0.028,
        value: null,
        required: true,
        groupName: null,
        optionLabel: null,
        autoFill: "NAME",
      },
      {
        type: "DATE",
        page: 1,
        xFrac: 0.271,
        yFrac: 0.346,
        wFrac: 0.23,
        hFrac: 0.028,
        value: null,
        required: true,
        groupName: null,
        optionLabel: null,
        autoFill: "DATE",
      },
      {
        type: "CHECKBOX",
        page: 1,
        xFrac: 0.234,
        yFrac: 0.419,
        wFrac: 0.026,
        hFrac: 0.02,
        value: null,
        required: true,
        groupName: null,
        optionLabel: null,
        autoFill: null,
      },
      // Page 1 (index 0) — plan selection. Radios sit to the RIGHT of the
      // Standard/Premium description lines (pdf y≈417 / 399) so labels don't overlap.
      {
        type: "RADIO",
        page: 0,
        xFrac: 0.72,
        yFrac: 0.457,
        wFrac: 0.14,
        hFrac: 0.025,
        value: null,
        required: true,
        groupName: "plan",
        optionLabel: "Standard",
        autoFill: null,
      },
      {
        type: "RADIO",
        page: 0,
        xFrac: 0.72,
        yFrac: 0.48,
        wFrac: 0.14,
        hFrac: 0.025,
        value: null,
        required: true,
        groupName: "plan",
        optionLabel: "Premium",
        autoFill: null,
      },
    ];
    const newFields: EditorField[] = samples.map((s) => ({
      ...s,
      id: tempId("fld"),
      recipientId: rid,
    }));
    // Replace this recipient's existing fields so re-clicking resets cleanly
    // (no duplicate stacks).
    setFields((prev) => [...prev.filter((f) => f.recipientId !== rid), ...newFields]);
    setMessage("Sample fields placed. Drag to fine-tune if needed, then Save.");
  }

  // ---- save & send ----
  async function save(): Promise<boolean> {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        recipients: recipients.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
        })),
        fields: fields.map((f) => ({
          recipientId: f.recipientId,
          type: f.type,
          page: f.page,
          xFrac: f.xFrac,
          yFrac: f.yFrac,
          wFrac: f.wFrac,
          hFrac: f.hFrac,
          value: f.value,
          required: f.required,
          groupName: f.groupName,
          optionLabel: f.optionLabel,
          autoFill: f.autoFill ?? null,
        })),
      };
      const res = await fetch(`/api/documents/${documentId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      // Re-sync ids so future saves update instead of duplicate.
      const doc = await res.json();
      const recs: EditorRecipient[] = (doc.recipients || []).map(
        (r: { id: string; name: string; email: string }) => ({
          id: r.id,
          name: r.name,
          email: r.email,
        })
      );
      setRecipients(recs);
      const flds: EditorField[] = (doc.fields || []).map(
        (f: FieldData & { id: string }) => ({ ...f, id: f.id })
      );
      setFields(flds);
      if (recs.length > 0 && !recs.some((r) => r.id === activeRecipientId)) {
        setActiveRecipientId(recs[0].id);
      }
      setMessage("Saved.");
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    if (recipients.length === 0) {
      setMessage("Add at least one recipient first.");
      return;
    }
    if (recipients.some((r) => !r.name || !r.email)) {
      setMessage("Every recipient needs a name and email.");
      return;
    }
    const ok = await save();
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/send`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Send failed");
      }
      setStatus("SENT");
      setMessage(
        "Your document has been sent — a signing invitation is on its way to each recipient by email."
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSaving(false);
    }
  }

  const locked = status !== "DRAFT";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* PDF + overlays */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h1 className="text-xl font-bold">{title || "Document"}</h1>
          <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            {status}
          </span>
        </div>

        {!locked && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded border bg-white p-2">
            <span className="text-sm text-slate-500">Place field:</span>
            {(["SIGNATURE", "TEXT", "DATE", "CHECKBOX", "RADIO"] as FieldType[]).map(
              (t) => (
                <button
                  key={t}
                  onClick={() => setActiveTool(activeTool === t ? null : t)}
                  className={`rounded border px-3 py-1 text-sm ${
                    activeTool === t
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              )
            )}
            {activeTool && (
              <span className="text-xs text-slate-500">
                Click on the page to drop a {activeTool.toLowerCase()} for the
                selected recipient.
              </span>
            )}
          </div>
        )}

        <div className="rounded border bg-slate-100 p-4">
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<p className="text-slate-500">Loading PDF…</p>}
            error={<p className="text-red-600">Failed to load PDF.</p>}
          >
            {Array.from({ length: numPages }, (_, i) => i).map((pageIndex) => (
              <div key={pageIndex} className="relative mx-auto mb-6 w-fit">
                <div
                  className="relative"
                  onClick={(e) => handlePageClick(e, pageIndex)}
                  style={{ cursor: activeTool && !locked ? "crosshair" : "default" }}
                >
                  <Page
                    pageNumber={pageIndex + 1}
                    width={PAGE_WIDTH}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onLoadSuccess={(p) =>
                      setPageSizes((prev) => ({
                        ...prev,
                        [pageIndex]: { w: p.width, h: p.height },
                      }))
                    }
                  />
                  {/* overlay fields for this page */}
                  {fields
                    .filter((f) => f.page === pageIndex)
                    .map((f) => (
                      <FieldBox
                        key={f.id}
                        field={f}
                        color={recipientColor(f.recipientId)}
                        locked={locked}
                        onChange={(patch) => updateField(f.id, patch)}
                        onRemove={() => removeField(f.id)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* sidebar */}
      <div className="space-y-5">
        <div className="rounded border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Recipients</h2>
            {!locked && (
              <button
                onClick={addRecipient}
                className="rounded bg-brand-blue px-2 py-1 text-xs font-medium text-white hover:bg-brand-bluedark"
              >
                + Add
              </button>
            )}
          </div>
          {recipients.length === 0 && (
            <p className="text-sm text-slate-500">No recipients yet.</p>
          )}
          <div className="space-y-3">
            {recipients.map((r) => {
              const isActive = r.id === activeRecipientId;
              return (
                <div
                  key={r.id}
                  className={`rounded border p-2 ${
                    isActive ? "border-brand-blue ring-1 ring-brand-blue/30" : ""
                  }`}
                  onClick={() => setActiveRecipientId(r.id)}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: recipientColor(r.id) }}
                    />
                    <span className="text-xs font-medium text-slate-500">
                      {isActive ? "Selected (fields go here)" : "Click to select"}
                    </span>
                  </div>
                  <input
                    disabled={locked}
                    value={r.name}
                    onChange={(e) =>
                      updateRecipient(r.id, { name: e.target.value })
                    }
                    placeholder="Name"
                    className="mb-1 w-full rounded border px-2 py-1 text-sm"
                  />
                  <input
                    disabled={locked}
                    value={r.email}
                    onChange={(e) =>
                      updateRecipient(r.id, { email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  {!locked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecipient(r.id);
                      }}
                      className="mt-1 text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* field list / properties */}
        <div className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">Fields ({fields.length})</h2>
          {fields.length === 0 && (
            <p className="text-sm text-slate-500">
              Select a tool above, then click the page to add fields.
            </p>
          )}
          <div className="max-h-72 space-y-2 overflow-auto">
            {fields.map((f) => (
              <div key={f.id} className="rounded border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {f.type}
                    {f.required && <span className="text-red-600"> *</span>} · p
                    {f.page + 1}
                  </span>
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: recipientColor(f.recipientId) }}
                  />
                </div>
                {f.type === "RADIO" && !locked && (
                  <div className="mt-1 space-y-1">
                    <input
                      value={f.groupName || ""}
                      onChange={(e) =>
                        updateField(f.id, { groupName: e.target.value })
                      }
                      placeholder="group name"
                      className="w-full rounded border px-1 py-0.5"
                    />
                    <input
                      value={f.optionLabel || ""}
                      onChange={(e) =>
                        updateField(f.id, { optionLabel: e.target.value })
                      }
                      placeholder="option label"
                      className="w-full rounded border px-1 py-0.5"
                    />
                  </div>
                )}
                {(f.type === "TEXT" || f.type === "DATE") && !locked && (
                  <label className="mt-1 flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Auto-fill</span>
                    <select
                      value={f.autoFill ?? ""}
                      onChange={(e) =>
                        updateField(f.id, {
                          autoFill: e.target.value === "" ? null : e.target.value,
                        })
                      }
                      className="w-full rounded border px-1 py-0.5 text-[10px]"
                    >
                      <option value="">None</option>
                      <option value="NAME">Recipient name</option>
                      <option value="EMAIL">Recipient email</option>
                      <option value="DATE">Today&apos;s date</option>
                    </select>
                  </label>
                )}
                {!locked && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Required <span className="text-red-600">*</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* actions */}
        {!locked && (
          <div className="space-y-2 rounded border bg-white p-4">
            {activeRecipientId && (
              <button
                onClick={autoPlaceSampleFields}
                disabled={saving || !loaded}
                className="w-full rounded border border-brand-blue px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
              >
                Auto-place sample fields
              </button>
            )}
            <button
              onClick={save}
              disabled={saving || !loaded}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save fields"}
            </button>
            <button
              onClick={send}
              disabled={saving || !loaded}
              className="w-full rounded bg-brand-orange px-3 py-2 text-sm font-medium text-white hover:bg-brand-orangedark disabled:opacity-50"
            >
              Save &amp; Send for signature
            </button>
          </div>
        )}

        {message && (
          <div className="rounded border bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- a draggable/resizable field box on the page -------------------------

function FieldBox({
  field,
  color,
  locked,
  onChange,
  onRemove,
}: {
  field: EditorField;
  color: string;
  locked: boolean;
  onChange: (patch: Partial<EditorField>) => void;
  onRemove: () => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  function getParentRect() {
    const parent = boxRef.current?.parentElement;
    return parent?.getBoundingClientRect();
  }

  function startDrag(e: React.MouseEvent) {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = getParentRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = field.xFrac;
    const origY = field.yFrac;

    function move(ev: MouseEvent) {
      const dx = (ev.clientX - startX) / rect!.width;
      const dy = (ev.clientY - startY) / rect!.height;
      onChange({
        xFrac: Math.min(Math.max(origX + dx, 0), 1 - field.wFrac),
        yFrac: Math.min(Math.max(origY + dy, 0), 1 - field.hFrac),
      });
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function startResize(e: React.MouseEvent) {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = getParentRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = field.wFrac;
    const origH = field.hFrac;

    function move(ev: MouseEvent) {
      const dw = (ev.clientX - startX) / rect!.width;
      const dh = (ev.clientY - startY) / rect!.height;
      onChange({
        wFrac: Math.min(Math.max(origW + dw, 0.02), 1 - field.xFrac),
        hFrac: Math.min(Math.max(origH + dh, 0.015), 1 - field.yFrac),
      });
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const labelMap: Record<string, string> = {
    SIGNATURE: "Signature",
    TEXT: "Text",
    CHECKBOX: "☑",
    RADIO: field.optionLabel || "Radio",
  };

  return (
    <div
      ref={boxRef}
      onMouseDown={startDrag}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: `${field.xFrac * 100}%`,
        top: `${field.yFrac * 100}%`,
        width: `${field.wFrac * 100}%`,
        height: `${field.hFrac * 100}%`,
        border: `2px solid ${color}`,
        background: `${color}22`,
        cursor: locked ? "default" : "move",
        boxSizing: "border-box",
      }}
      className="group flex items-center justify-center overflow-hidden text-[10px] font-medium"
    >
      {!locked && (field.type === "RADIO" || field.type === "TEXT") ? (
        <input
          value={field.type === "RADIO" ? field.optionLabel || "" : field.value || ""}
          onChange={(e) =>
            onChange(
              field.type === "RADIO"
                ? { optionLabel: e.target.value }
                : { value: e.target.value }
            )
          }
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          placeholder={field.type === "RADIO" ? "Option label" : "Type text…"}
          className="w-full bg-transparent px-1 text-center text-[10px] outline-none placeholder:opacity-60"
          style={{ color }}
        />
      ) : (
        <span style={{ color }} className="pointer-events-none select-none px-0.5">
          {labelMap[field.type]}
        </span>
      )}
      {!locked && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute -right-2 -top-2 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] leading-none text-white group-hover:flex"
            title="Remove"
          >
            ×
          </button>
          <div
            onMouseDown={startResize}
            className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize"
            style={{ background: color }}
            title="Resize"
          />
        </>
      )}
    </div>
  );
}
