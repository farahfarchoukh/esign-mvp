"use client";

import dynamic from "next/dynamic";

// react-pdf must never render on the server. Load the editor client-only.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <p className="text-slate-500">Loading editor…</p>,
});

export default function EditorLoader({ documentId }: { documentId: string }) {
  return <Editor documentId={documentId} />;
}
