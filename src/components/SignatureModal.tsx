"use client";

import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignatureModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const ref = useRef<SignatureCanvas | null>(null);

  const handleSave = () => {
    const c = ref.current;
    if (!c || c.isEmpty()) return;
    // Use trimmed canvas for a tight signature image.
    const dataUrl = c.getTrimmedCanvas().toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">Draw your signature</h3>
        <div className="rounded border bg-slate-50">
          <SignatureCanvas
            ref={ref}
            penColor="black"
            canvasProps={{
              width: 480,
              height: 200,
              className: "w-full rounded",
            }}
          />
        </div>
        <div className="mt-3 flex justify-between">
          <button
            onClick={() => ref.current?.clear()}
            className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Clear
          </button>
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
