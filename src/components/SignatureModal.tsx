"use client";

import { useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignatureModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const ref = useRef<SignatureCanvas | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Size the canvas backing store to its display size × devicePixelRatio, so the
  // captured signature is crisp on high-DPI / Retina screens. Without this the
  // canvas records strokes at a low, mismatched resolution and the stamped
  // signature comes out blocky/blurry. This mirrors signature_pad's recommended
  // HiDPI handling.
  useEffect(() => {
    const resize = () => {
      const canvas = ref.current?.getCanvas();
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const cssWidth = wrap.clientWidth;
      const cssHeight = 200;
      canvas.width = Math.round(cssWidth * ratio);
      canvas.height = Math.round(cssHeight * ratio);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      const ctx = canvas.getContext("2d");
      ctx?.scale(ratio, ratio);
      // Re-clear so signature_pad's internal point buffer matches the new size.
      ref.current?.clear();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const handleSave = () => {
    const c = ref.current;
    if (!c || c.isEmpty()) return;
    // Trimmed, full-resolution PNG of the signature.
    const dataUrl = c.getTrimmedCanvas().toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">Draw your signature</h3>
        <div ref={wrapRef} className="rounded border bg-slate-50">
          <SignatureCanvas
            ref={ref}
            penColor="black"
            minWidth={1.2}
            maxWidth={2.6}
            canvasProps={{
              className: "rounded touch-none block",
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
